# Arsitektur Sistem — Website Masjid Baitul Fadli

## 1. Gambaran Umum

```
 Pengguna (HP/Tablet/Desktop, PWA)
        │ HTTPS
        ▼
 ┌──────────────────────── Vercel (Hobby/gratis) ────────────────────────┐
 │ Next.js 16 (App Router, TypeScript, Tailwind)                          │
 │  • Halaman publik  → ISR (cache 5 menit + revalidasi saat admin ubah)  │
 │  • /akun, /admin   → render server per request, dicek sesi & role      │
 │  • Server Actions  → semua operasi tulis (validasi Zod + cek role)     │
 │  • /api/telegram/webhook  ← Telegram (verifikasi secret header)        │
 │  • /api/cron/reminders    ← Vercel Cron 1x/hari 07.00 WIB (Bearer)     │
 └───────────────┬────────────────────────────────────┬───────────────────┘
                 │ supabase-js (publishable key + JWT user)   │ secret key (server only)
                 ▼                                             ▼
 ┌──────────────────────── Supabase (Free) ──────────────────────────────┐
 │ Auth (email+password) · PostgreSQL + RLS · Storage (3 bucket)          │
 │ RPC SECURITY DEFINER untuk proses bisnis bernilai (publikasi laporan,  │
 │ verifikasi pembayaran, generate tagihan, penautan Telegram)            │
 └────────────────────────────────────────────────────────────────────────┘
                 ▲
                 │ sendMessage (server → Telegram Bot API)
           Telegram Bot
```

**Prinsip desain**
1. **Database adalah benteng terakhir.** Walau UI & Server Action sudah memeriksa role, setiap tabel tetap dilindungi RLS + GRANT kolom. Bug di frontend tidak bisa membocorkan data.
2. **Tidak ada proses background permanen.** Semua pekerjaan terjadwal berupa endpoint idempoten yang dipicu cron eksternal.
3. **Idempoten di level database.** Unique constraint mencegah tagihan & pengingat ganda, bukan sekadar logika aplikasi.
4. **Rahasia hanya di server.** `SUPABASE_SECRET_KEY`, `TELEGRAM_BOT_TOKEN`, `CRON_SECRET`, `TELEGRAM_WEBHOOK_SECRET` tidak pernah diberi prefix `NEXT_PUBLIC_`; modul yang memakainya diberi `import "server-only"` sehingga build gagal bila terimpor ke klien.

## 2. Struktur Database

| Tabel | Isi | Relasi utama |
|---|---|---|
| `profiles` | nama, HP, email, **role** (`admin`/`user`) | 1:1 `auth.users` |
| `site_settings` | profil masjid, kontak, info rekening (1 baris) | — |
| `donation_programs` | program donasi publik | — |
| `categories` | kategori pemasukan/pengeluaran (`is_system` utk "Donatur Tetap") | — |
| `transactions` | transaksi kas | → `categories`, → `donation_periods` (opsional, unik) |
| `financial_reports` | laporan per periode + **snapshot** angka saat terbit | — |
| `events` | agenda kegiatan | — |
| `donor_subscriptions` | pengaturan donasi rutin (1 per user) | → `profiles` |
| `donation_periods` | **tagihan per periode** + status pembayaran | → `donor_subscriptions`, `UNIQUE(subscription_id, period_key)` |
| `telegram_links` | chat_id Telegram terverifikasi | 1:1 `profiles` |
| `telegram_link_tokens` | token penautan sekali pakai (hanya hash SHA-256, berlaku 15 menit) | → `profiles` |
| `reminder_logs` | log pengiriman pengingat | → `donation_periods`, `UNIQUE(period_id, kind)` untuk otomatis |
| `audit_logs` | jejak semua perubahan (data lama & baru, pelaku, waktu) | → `profiles` |

**Status pembayaran (`period_status`)**

| Nilai | Label UI | Kapan |
|---|---|---|
| `pending` | Menunggu Pembayaran | tagihan periode berjalan terbentuk |
| `awaiting_verification` | Menunggu Verifikasi | donatur menekan "Saya Sudah Bayar" |
| `paid` | Sudah Dibayar | admin memverifikasi |
| `unpaid` | Belum Dibayar | periode lewat (sudah ada periode baru / > 35 hari) tanpa pembayaran |

**Kunci periode (tutup buku).** Trigger `transactions_before_write` menolak insert/update/delete transaksi yang tanggalnya masuk periode laporan berstatus `published`. Koreksi hanya bisa dengan *membatalkan publikasi* (wajib alasan, tercatat di audit log). Dengan ini angka yang sudah dilihat jamaah tidak bisa berubah diam-diam.

## 3. Hak Akses (RBAC + RLS)

| Data | Publik (anon) | Donatur (login) | Admin |
|---|---|---|---|
| Pengaturan situs, kategori, program aktif | baca | baca | baca/tulis |
| Agenda | baca yang terbit | baca yang terbit | penuh |
| Laporan keuangan | baca yang terbit | baca yang terbit | penuh (publikasi via RPC) |
| Transaksi | hanya via RPC `get_public_report_transactions` (periode terbit) | ✗ | penuh (kecuali periode terkunci) |
| Profil | ✗ | milik sendiri (ubah nama & HP saja) | baca semua, ubah role via RPC |
| Donasi rutin | ✗ | milik sendiri | baca semua, ubah status |
| Tagihan | ✗ | milik sendiri; konfirmasi via RPC | baca semua; verifikasi via RPC |
| Telegram | ✗ | status sendiri (**chat_id tidak diekspos**) | status semua |
| Audit log, log pengingat | ✗ | ✗ | baca |
| Storage `payment-proofs` | ✗ | unggah/baca folder `<user_id>/` | baca semua |
| Storage `transaction-proofs` | ✗ | ✗ | penuh |
| Storage `public-media` | baca | baca | tulis |

Lapisan pertahanan berlapis:
1. `proxy.ts` — memaksa login untuk `/akun` dan `/admin`.
2. Layout server — `requireAdmin()` memeriksa role dari database.
3. Server Action — `getAdminOrNull()` + validasi Zod di setiap aksi.
4. PostgreSQL — RLS, GRANT per kolom (mis. user tidak bisa `UPDATE role`), fungsi `SECURITY DEFINER` dengan `search_path=''`.

Semua aturan ini diuji otomatis di `supabase/tests/database.test.sql` (76 test pgTAP).

## 4. Alur Autentikasi (tanpa email)

1. Daftar: Server Action memeriksa honeypot, rate limit per IP (hash), dan keunikan nomor HP → `auth.admin.createUser({ email_confirm: true })` → trigger `handle_new_user` membuat `profiles` (role `user`, HP dinormalisasi `08…`) → langsung login. Supabase tidak mengirim email apa pun.
2. Masuk: identitas berupa email atau nomor HP; nomor HP dicari ke email akun via service role, lalu `signInWithPassword`. Pesan gagal selalu generik.
3. Sesi disimpan di cookie HttpOnly oleh `@supabase/ssr`; `proxy.ts` me-refresh token dan memverifikasi JWT (`getClaims`).
4. Admin pertama dibuat manual lewat SQL (lihat README). Admin berikutnya diangkat dari menu **Pengguna & Role**; admin terakhir tidak bisa diturunkan.
5. Lupa sandi: token acak 256-bit (hash SHA-256 di tabel `password_reset_tokens`, berlaku 30 menit) dikirim sebagai tautan ke Telegram tertaut → `/reset-password?token=…` → `consume_password_reset_token` (atomik, sekali pakai, membatalkan token lain) → `auth.admin.updateUserById`. Rate limit 10/jam per IP dan 3/jam per identitas.
6. Cadangan: admin membuat kata sandi sementara (tampil sekali, tercatat di audit log; donatur diberi tahu via Telegram bila tertaut).

## 5. Integrasi Telegram

**Penautan akun (anti-spoofing):**
1. Donatur menekan **Hubungkan ke Telegram** → server membuat token acak 192-bit, menyimpan **hash SHA-256**-nya (berlaku 15 menit, maks 5 per 10 menit).
2. Donatur membuka `https://t.me/<bot>?start=<token>` dan menekan **MULAI**.
3. Telegram mengirim update ke `/api/telegram/webhook` dengan header `X-Telegram-Bot-Api-Secret-Token` → diverifikasi (perbandingan constant-time).
4. RPC `link_telegram_account` menandai token terpakai secara atomik lalu menyimpan `chat_id`. Token tidak bisa dipakai dua kali.
5. Bot membalas konfirmasi; halaman profil memperbarui status otomatis.

Perintah bot: `/start`, `/status`, `/putuskan`, `/bantuan`. Jika donatur memblokir bot (HTTP 403), tautan dihapus otomatis.

Notifikasi lain: admin yang menautkan Telegram mendapat pemberitahuan saat ada konfirmasi pembayaran; donatur mendapat ucapan terima kasih saat pembayaran diverifikasi.

## 6. Penjadwalan Reminder (kompatibel free tier)

Kendala: Vercel Hobby tidak menjalankan proses background dan cron hanya **1x per hari** (waktu eksekusi bisa meleset dalam jam tersebut).

Desain:
- `vercel.json` → `GET /api/cron/reminders` setiap hari **00:00 UTC (07.00 WIB)**, diamankan `Authorization: Bearer CRON_SECRET` (otomatis dikirim Vercel).
- Endpoint melakukan dua hal:
  1. `generate_donation_periods()` — membuat tagihan untuk siklus berjalan jika `hari ini ≥ jatuh tempo` (`ON CONFLICT DO NOTHING` pada `(subscription_id, period_key)`), sekaligus menandai periode lama menjadi `unpaid`. Karena berbasis "siklus berjalan", cron yang terlewat beberapa hari tetap mengejar.
  2. Mengirim pengingat: `due` (H+0 s.d. H+2, mengejar bila cron terlewat) dan `followup` (H+3 s.d. H+6) hanya untuk tagihan `pending`. Sebelum kirim, slot diklaim atomik via `claim_reminder` (unique index) → **tidak mungkin terkirim ganda** walau endpoint dipanggil paralel. Gagal kirim dicoba ulang maksimal 3x pada run berikutnya.
- Pesan hanya dikirim pukul 06.00–21.00 WIB.
- **Cadangan opsional (gratis):** `supabase/optional/backup-scheduler.sql` (pg_cron + pg_net, 08.30 WIB). Admin juga punya tombol **Jalankan Pengingat Sekarang**.
- Efek samping positif: aktivitas harian ke database mencegah proyek Supabase Free di-*pause* karena tidak aktif 7 hari.

Kapasitas: satu run memproses hingga 300 kandidat dalam batas 60 detik (≈ 15 pesan/detik, di bawah limit Telegram 30/detik). Cukup untuk ratusan donatur.

## 7. Batas Free Tier & Mitigasi

| Sumber daya | Batas (perkiraan, cek dokumentasi terbaru) | Mitigasi di aplikasi |
|---|---|---|
| Supabase DB | 500 MB | data teks ringan; ribuan transaksi/tahun ≈ < 10 MB |
| Supabase Storage | 1 GB | foto dikompres di perangkat (maks 1600px, JPEG 80%), batas 3 MB/file |
| Supabase Auth email bawaan | sangat terbatas per jam | **tidak dipakai sama sekali** — pendaftaran via Admin API, reset via Telegram/admin |
| Supabase pause | setelah 7 hari tanpa aktivitas | cron harian menjaga proyek tetap aktif |
| Vercel function | durasi & invocations terbatas | halaman publik ISR; upload langsung browser → Storage (tidak lewat Vercel) |
| Vercel Cron Hobby | 1x/hari | logika "mengejar" + pg_cron cadangan |

## 8. PWA

- `app/manifest.ts` (standalone, ikon 192/512 + maskable, shortcut).
- `public/sw.js`: aset statis cache-first; halaman publik network-first dengan fallback cache → `offline.html`; **halaman `/akun` & `/admin` dan API tidak pernah di-cache** (data pribadi).
- Tombol pasang: Android/desktop memakai `beforeinstallprompt`; iOS menampilkan panduan "Bagikan → Tambah ke Layar Utama".

## 9. Keamanan Tambahan

- Header keamanan: CSP ketat, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- Validasi input dengan Zod di server + constraint CHECK di database.
- Parameter `next` setelah login divalidasi (anti open-redirect).
- Pesan error database dipetakan ke bahasa yang ramah tanpa membocorkan detail teknis.
- Keterangan transaksi otomatis donatur tidak memuat nama (privasi di laporan publik).

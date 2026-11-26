# Website Masjid Baitul Fadli

Pusat informasi, transparansi keuangan, dan manajemen donatur tetap Masjid Baitul Fadli.
Progressive Web App (dapat dipasang di Android, iOS, dan desktop), dirancang ramah pengguna lanjut usia.

**Teknologi:** Next.js 16 (TypeScript, App Router) · Tailwind CSS 4 · Supabase (PostgreSQL, Auth, Storage, RLS) · Vercel (hosting + Cron) · Telegram Bot API.
Seluruhnya dapat berjalan di **paket gratis** Vercel Hobby + Supabase Free.

Dokumentasi teknis lengkap (arsitektur, skema database, RLS, alur Telegram, penjadwalan): [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Fitur

| Publik | Donatur (login) | Admin |
|---|---|---|
| Beranda: profil, visi-misi, kontak | Daftar tanpa konfirmasi email, masuk dengan **nomor HP atau email** | Dashboard ringkasan kas & donatur |
| Laporan keuangan yang sudah dipublikasikan + rincian transaksi | Atur nominal & jadwal (mingguan/bulanan) | Transaksi pemasukan/pengeluaran + bukti |
| Agenda mendatang & sebelumnya | Hubungkan Telegram (pengingat otomatis) | Laporan per periode, publikasi = tutup buku |
| Program donasi & info rekening | Konfirmasi "Saya Sudah Bayar" + foto bukti | Verifikasi pembayaran (otomatis tercatat sebagai pemasukan) |
| Pasang sebagai aplikasi (PWA) | Riwayat & status pembayaran per periode | Donatur tetap, filter belum bayar, kirim pengingat |
| | Jeda / berhenti / aktifkan kembali | Agenda, program, kategori, pengaturan, role, log aktivitas |

---

## Panduan Deploy (± 30–45 menit)

### 1. Supabase
1. Buat proyek di [supabase.com](https://supabase.com) (region **Singapore**).
2. Terapkan skema database. Pilih salah satu:
   - **CLI (disarankan):**
     ```bash
     npx supabase login
     ```
     ```bash
     npx supabase link --project-ref <PROJECT_REF>
     ```
     ```bash
     npx supabase db push
     ```
   - **Manual:** buka *SQL Editor*, jalankan berurutan isi file di `supabase/migrations/` (0100 → 0400).
3. **Authentication → URL Configuration**
   - *Site URL*: `https://<domain-anda>.vercel.app`
   - *Redirect URLs*: `https://<domain-anda>.vercel.app/**`
4. **Tidak perlu SMTP / email konfirmasi.** Akun dibuat di server dan langsung aktif; aplikasi tidak pernah mengirim email. Lupa kata sandi ditangani lewat Telegram atau oleh admin (lihat bagian *Autentikasi*). **Wajib:** matikan *Authentication → Sign In / Providers → Allow new users to sign up* (akun hanya dibuat lewat server aplikasi yang punya anti-bot & rate limit; tanpa ini, siapa pun bisa mendaftar langsung ke API Supabase memakai publishable key). Matikan juga *Confirm email*.
5. Catat dari **Project Settings → API Keys**: Project URL, *Publishable key*, dan *Secret key*.

### 2. Bot Telegram
1. Chat [@BotFather](https://t.me/BotFather) → `/newbot` → beri nama (mis. *Masjid Baitul Fadli*) dan username (mis. `BaitulFadliBot`).
2. Simpan **token** bot. Opsional: `/setuserpic` untuk logo masjid.

### 3. Vercel
1. Import repository GitHub ini di [vercel.com/new](https://vercel.com/new).
2. Isi **Environment Variables** (lihat `.env.example`):

   | Nama | Nilai |
   |---|---|
   | `NEXT_PUBLIC_SITE_URL` | `https://<domain-anda>.vercel.app` |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL Supabase |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key |
   | `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | username bot tanpa `@` |
   | `SUPABASE_SECRET_KEY` | Secret key (**rahasia**) |
   | `TELEGRAM_BOT_TOKEN` | token BotFather (**rahasia**) |
   | `TELEGRAM_WEBHOOK_SECRET` | string acak ≥ 32 karakter (huruf/angka/`-`/`_`) |
   | `CRON_SECRET` | string acak ≥ 32 karakter |

   Membuat string acak:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   ```
3. Deploy. Vercel Cron otomatis aktif dari `vercel.json` (setiap hari 07.00 WIB).

### 4. Admin pertama
1. Daftar akun biasa di website (`/daftar`) memakai email pengurus.
2. Di Supabase *SQL Editor*:
   ```sql
   update public.profiles set role = 'admin' where email = 'email-pengurus@contoh.com';
   ```
3. Masuk kembali → otomatis ke `/admin`. Admin berikutnya cukup diangkat dari menu **Pengguna & Role**.

### 5. Konfigurasi awal di dashboard admin
1. **Pengaturan** → isi profil masjid, alamat, kontak, link Google Maps, dan **info rekening** (tampil di website & pesan pengingat).
2. **Pengaturan → Aktifkan / Perbarui Webhook** (menghubungkan bot ke website).
3. Admin menautkan Telegram sendiri (menu Akun → Profil) agar menerima notifikasi konfirmasi pembayaran.
4. Opsional: jalankan `supabase/optional/backup-scheduler.sql` untuk penjadwal cadangan.

---

## Autentikasi (tanpa ketergantungan email)

| Kebutuhan | Solusi |
|---|---|
| Pendaftaran | Akun dibuat lewat Supabase Admin API (`email_confirm: true`) → langsung aktif, tanpa email. Dilindungi *honeypot* anti-bot + batas 5 pendaftaran/jam per IP. |
| Masuk | Nomor HP **atau** email + kata sandi. Format `08…`, `62…`, `+62…` dikenali; nomor HP unik per akun. Batas 20 percobaan/15 menit per IP. |
| Lupa kata sandi | Tautan reset sekali pakai (30 menit) dikirim ke **Telegram** yang sudah tertaut. Respons selalu sama agar keberadaan akun tidak bisa ditebak. |
| Belum punya Telegram | Admin menekan **Reset Kata Sandi** (menu Donatur atau Pengguna & Role) → kata sandi sementara tampil sekali, bisa dikirim via WhatsApp. Tercatat di log aktivitas. |

Konsekuensi yang perlu disadari: email tidak diverifikasi, jadi jangan menjadikan email sebagai saluran resmi. Saluran resmi adalah Telegram & nomor HP.

---

## Pengembangan Lokal

Prasyarat: Node.js 20+, Docker (untuk Supabase lokal).

```bash
npm install
```
```bash
npx supabase start
```
```bash
cp .env.example .env.local
```
Isi `.env.local` dengan URL & key yang ditampilkan `supabase start` (`http://127.0.0.1:54321`), lalu:
```bash
npm run dev
```
Email konfirmasi lokal dapat dilihat di Mailpit: http://127.0.0.1:54324

### Pengujian
```bash
npm run test:db
```
76 test pgTAP: RLS, RBAC, kunci periode, anti-duplikasi tagihan & reminder, penautan Telegram, nomor HP unik, token reset, rate limit.
```bash
npm test
```
Unit test validasi input & perhitungan jadwal.
```bash
npm run lint && npm run typecheck && npm run build
```

Setelah mengubah skema: buat migrasi baru di `supabase/migrations/`, lalu `npm run db:types`.

## Struktur Proyek
```
src/
  app/(public)/      Beranda, /keuangan, /agenda, /donasi (ISR)
  app/(auth)/        /masuk, /daftar, /lupa-password, /reset-password
  app/akun/          Dashboard donatur
  app/admin/         Dashboard admin
  app/api/cron/      Endpoint reminder harian
  app/api/telegram/  Webhook bot
  components/        UI (ramah lansia), PWA, form
  lib/actions/       Server Actions (semua operasi tulis)
  lib/supabase/      Klien server / browser / service role
  proxy.ts           Refresh sesi & proteksi rute
supabase/
  migrations/        Skema, RLS, fungsi, storage
  tests/             Test database (pgTAP)
  optional/          Penjadwal cadangan pg_cron
public/sw.js         Service worker
```

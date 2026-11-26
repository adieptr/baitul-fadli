-- =====================================================================
-- Konten resmi Masjid Baitul Fadli (sumber: masjidbaitulfadli.or.id)
-- + kolom jam layanan masjid.
-- Aman dijalankan ulang: agenda & program hanya ditambahkan jika belum ada.
-- =====================================================================

alter table public.site_settings
  add column if not exists service_hours text not null default '' check (char_length(service_hours) <= 200);
grant update (service_hours) on public.site_settings to authenticated;

update public.site_settings set
  mosque_name = 'Masjid Baitul Fadli',
  tagline = 'Pusat ibadah, pembinaan umat, dan pemberdayaan masyarakat',
  address = 'Gg. Pisang, Gunung Anyar Tambak, Kec. Gunung Anyar, Surabaya, Jawa Timur 60294',
  phone = '+62 811-272-825',
  email = 'masjidbaitulfadli.sby@gmail.com',
  service_hours = 'Setiap hari, 07.00–17.00 WIB',
  profile_content = $article$Assalamu'alaikum warahmatullahi wabarakatuh.

**Masjid Baitul Fadli (MBF)** di Gunung Anyar Tambak, Surabaya, adalah pusat kegiatan ibadah, dakwah, pendidikan Islam, pembinaan umat, dan pemberdayaan masyarakat. Masjid ini terbuka bagi seluruh jamaah dan masyarakat sekitar untuk mengikuti kegiatan keagamaan maupun berbagai program sosial.

## Sejarah Singkat

Masjid Baitul Fadli berdiri di atas **tanah wakaf seluas ±180 m²** dari dr. Miralda. Tanah tersebut telah diserahkan kepada Muhammadiyah sekitar 20 tahun sebelum pembangunan dimulai, namun cukup lama belum dimanfaatkan secara optimal.

Pada tahun 2023, pembangunan masjid kembali dihidupkan dengan dukungan administrasi dan pendanaan, termasuk dana klaim asuransi kecelakaan pesawat yang diperuntukkan sebagai amal jariyah untuk mengenang seorang pilot korban tragedi tersebut.

Nama **Baitul Fadli** menjadi bentuk penghormatan kepada almarhum **Fadly Satrianto**, putra Surabaya yang menjadi salah satu korban kecelakaan pesawat Sriwijaya Air SJ-182 pada 9 Januari 2021. Semoga masjid ini menjadi amal jariyah yang pahalanya terus mengalir untuk beliau.

### Tonggak Sejarah

- **Agustus 2023** — peletakan batu pertama pembangunan masjid.
- **2023** — pembangunan lantai pertama diprioritaskan agar segera dapat digunakan untuk ibadah.
- **10 Maret 2024** — pelaksanaan shalat Tarawih perdana.
- **Ramadhan 1445 H** — masjid mulai resmi digunakan untuk kegiatan ibadah.
- **Selanjutnya** — pembangunan lantai dua untuk mendukung pendidikan dan pembinaan umat.

> "Sesungguhnya yang memakmurkan masjid-masjid Allah hanyalah orang-orang yang beriman kepada Allah dan hari akhir…" — QS. At-Taubah: 18

## Visi

Menjadikan masjid sebagai pusat ibadah, pembinaan umat, dan pemberdayaan masyarakat yang berlandaskan ajaran Islam, modern, dan berkemajuan.

## Misi dan Fungsi Masjid

1. **Imarah (Memakmurkan Masjid)** — melaksanakan kegiatan keagamaan yang kondusif dan nyaman, serta memakmurkan masjid melalui ibadah yang intensif.
2. **Ri'ayah (Mengelola Masjid)** — mengelola masjid sebagai pusat ibadah yang tertata rapi dan nyaman melalui pengelolaan yang modern dan berkemajuan.
3. **Pembinaan Umat (Ta'mirul Ummah)** — melalui majelis taklim, peringatan hari besar Islam, pembinaan remaja masjid, dan pemberdayaan ekonomi umat.
4. **Fungsi Sosial dan Pemberdayaan** — berperan aktif memberdayakan umat dan masyarakat sekitar melalui program yang bermanfaat.
5. **Pusat Kajian Keislaman** — menjadi pusat kajian keislaman, ketarjihan, penyelidikan agama, serta pelayanan keagamaan bagi umat.

## Program dan Kegiatan

- **Ibadah:** shalat berjamaah lima waktu, shalat Jumat, dan shalat Tarawih di bulan Ramadhan.
- **Kajian:** kajian rutin keislaman, kajian tafsir Al-Qur'an dan hadits, serta majelis taklim.
- **Pendidikan:** Taman Pendidikan Al-Qur'an (TPQ), dibuka 15 September 2025, untuk membentuk generasi Qur'ani yang berakhlak mulia.
- **Sosial:** *Jumat Berkah* — prasmanan makan siang gratis setiap Jumat selepas shalat Jumat, terbuka bagi jamaah dan masyarakat sekitar.
- **Pembinaan:** peringatan hari besar Islam dan pembinaan remaja masjid.

## Pengurus Takmir Periode 2024–2029

- **Imam Masjid:** Rifky Rizal Furqon, Erfan Zubki
- **Bidang Kepemudaan:** Alguna Awa Sapta, Uzair Ahmad, Fatoni
- **Bidang Muslimah:** Ibu Tania Mario, Ibu Martini Rosid, Ibu Hartini Mulyadi, Ibu Heri Astuti

## Mari Memakmurkan Masjid

Kami mengajak Bapak/Ibu untuk hadir dalam kegiatan masjid dan turut mendukung operasional serta pengembangannya, salah satunya dengan menjadi **donatur tetap**. Setiap amanah yang dititipkan dicatat dan dilaporkan secara terbuka.$article$
where id = 1;

-- Dokumentasi kegiatan (agenda yang sudah terlaksana)
insert into public.events (title, description, event_date, location, is_published)
select v.title, v.description, v.event_date::date, 'Masjid Baitul Fadli', true
from (values
  ('Pembukaan TPQ Masjid Baitul Fadli', '2025-09-15',
   'Peresmian Taman Pendidikan Al-Qur''an (TPQ) Masjid Baitul Fadli untuk memfasilitasi pembelajaran Al-Qur''an, memperdalam pendidikan Islam, serta membentuk generasi Qur''ani yang berakhlak mulia.'),
  ('Jumat Berkah: Prasmanan Gratis', '2025-09-19',
   'Makan siang prasmanan gratis selepas shalat Jumat bagi jamaah dan masyarakat sekitar — untuk membantu sesama, meningkatkan kepedulian sosial, mempererat silaturahmi, dan menumbuhkan budaya berbagi.'),
  ('Rapat Bulanan Takmir Masjid Baitul Fadli', '2025-09-25',
   'Pertemuan rutin pengurus takmir untuk merencanakan program masjid, mengevaluasi kegiatan yang telah berjalan, meningkatkan pelayanan kepada jamaah, dan mengembangkan kegiatan kemasyarakatan.')
) as v(title, event_date, description)
where not exists (
  select 1 from public.events e where e.title = v.title and e.event_date = v.event_date::date
);

-- Program yang dapat didukung jamaah (tanpa target nominal — isi bila sudah ditetapkan pengurus)
insert into public.donation_programs (title, description, sort_order, is_active)
select v.title, v.description, v.sort_order, true
from (values
  ('Operasional & Kemakmuran Masjid', 'Mendukung kebutuhan rutin masjid: listrik, air, kebersihan, perawatan, serta penyelenggaraan ibadah dan kajian.', 0),
  ('Jumat Berkah', 'Prasmanan makan siang gratis setiap Jumat selepas shalat Jumat untuk jamaah dan masyarakat sekitar.', 1),
  ('TPQ Masjid Baitul Fadli', 'Pendidikan Al-Qur''an untuk membentuk generasi Qur''ani yang berakhlak mulia.', 2),
  ('Pembangunan Lantai Dua', 'Pengembangan masjid ke lantai dua untuk mendukung kegiatan pendidikan dan pembinaan umat.', 3)
) as v(title, description, sort_order)
where not exists (select 1 from public.donation_programs p where p.title = v.title);

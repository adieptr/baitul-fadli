-- =====================================================================
-- Profil masjid menjadi satu artikel (menggantikan kata sambutan,
-- sejarah, visi, misi yang terpisah) + foto sampul beranda.
-- Format artikel sederhana: "## Subjudul", "- poin", "> kutipan",
-- **tebal**, baris kosong = paragraf baru.
-- =====================================================================

alter table public.site_settings
  add column profile_content text not null default '' check (char_length(profile_content) <= 20000),
  add column hero_image_path text check (hero_image_path is null or hero_image_path ~ '^[a-zA-Z0-9/_.-]+$');

-- Pindahkan isi lama. Jika sejarah belum pernah diisi admin (masih teks
-- bawaan), gunakan artikel bawaan yang layak tayang.
update public.site_settings
set profile_content = case
  when history = '' or history like 'Silakan lengkapi%' then
$article$Assalamu'alaikum warahmatullahi wabarakatuh.

Selamat datang di website resmi **Masjid Baitul Fadli**. Nama *Baitul Fadli* bermakna "rumah karunia" — harapan kami, masjid ini menjadi tempat jamaah merasakan karunia Allah melalui ibadah, ilmu, dan kebersamaan.

Masjid bukan hanya tempat shalat, tetapi juga pusat pembinaan umat: tempat belajar Al-Qur'an, menuntut ilmu, mempererat silaturahmi, dan saling membantu sesama warga.

> "Sesungguhnya yang memakmurkan masjid-masjid Allah hanyalah orang-orang yang beriman kepada Allah dan hari akhir…" — QS. At-Taubah: 18

## Visi

Menjadi masjid yang makmur, amanah, dan bermanfaat bagi umat.

## Misi

- Menyelenggarakan ibadah dengan tertib, khusyuk, dan nyaman bagi seluruh jamaah.
- Mengelola keuangan masjid secara transparan dan amanah, dengan laporan yang terbuka untuk publik.
- Menghidupkan kegiatan dakwah, pendidikan, dan sosial bagi semua usia.
- Mempererat ukhuwah dan kepedulian antarwarga di lingkungan sekitar masjid.

## Mari Memakmurkan Masjid

Kami mengajak Bapak/Ibu untuk hadir dalam kegiatan masjid dan mendukung operasionalnya, salah satunya dengan menjadi **donatur tetap**. Setiap amanah yang dititipkan dicatat dan dilaporkan secara terbuka.$article$
  else concat_ws(E'\n\n',
    nullif(trim(welcome_message), ''),
    '## Sejarah Singkat' || E'\n\n' || trim(history),
    case when trim(vision) <> '' then '## Visi' || E'\n\n' || trim(vision) end,
    case when trim(mission) <> '' then '## Misi' || E'\n\n' ||
      (select string_agg('- ' || trim(l), E'\n') from unnest(string_to_array(mission, E'\n')) l where trim(l) <> '')
    end)
  end;

-- Teks bawaan rekening jangan tampil ke publik.
update public.site_settings set payment_info = '' where payment_info like 'Silakan lengkapi%';

alter table public.site_settings
  drop column welcome_message,
  drop column history,
  drop column vision,
  drop column mission;

grant update (profile_content, hero_image_path) on public.site_settings to authenticated;

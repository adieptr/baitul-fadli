import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Masjid Baitul Fadli",
    short_name: "Baitul Fadli",
    description: "Informasi, agenda, transparansi keuangan, dan donasi rutin Masjid Baitul Fadli.",
    lang: "id-ID",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f8faf9",
    theme_color: "#1f3d6d",
    categories: ["lifestyle", "education", "finance"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Akun Donatur", url: "/akun", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Laporan Keuangan", url: "/keuangan", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}

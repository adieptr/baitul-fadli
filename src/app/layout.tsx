import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker";
import { Toaster } from "@/components/ui/toast";
import { publicEnv } from "@/lib/env";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl),
  title: {
    default: "Masjid Baitul Fadli",
    template: "%s · Masjid Baitul Fadli",
  },
  description:
    "Website resmi Masjid Baitul Fadli: agenda kegiatan, laporan keuangan yang transparan, dan program donatur tetap.",
  applicationName: "Baitul Fadli",
  appleWebApp: { capable: true, title: "Baitul Fadli", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "Masjid Baitul Fadli",
    images: [{ url: "/icons/icon-512.png", width: 512, height: 512 }],
  },
};

export const viewport: Viewport = {
  themeColor: "#047857",
  width: "device-width",
  initialScale: 1,
  // Jangan kunci zoom: pengguna lanjut usia sering perlu memperbesar layar.
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={jakarta.variable}>
      <body className="min-h-dvh font-sans antialiased">
        <a
          href="#konten"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3"
        >
          Lewati ke konten utama
        </a>
        {children}
        <Toaster />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { getSiteSettings } from "@/lib/queries/public";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  return (
    <>
      <SiteHeader mosqueName={settings.mosque_name} />
      <main id="konten">{children}</main>
      <SiteFooter settings={settings} />
      <InstallPrompt />
    </>
  );
}

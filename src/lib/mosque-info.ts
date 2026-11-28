import { parseRichText } from "@/components/public/rich-text";
import type { MosqueInfo } from "@/components/app/mosque-info-dialog";
import type { SiteSettings } from "@/lib/queries/public";
import { publicMediaUrl } from "@/lib/storage";

/** Ringkasan singkat untuk popup: paragraf pertama artikel profil (tanpa salam), maks ±220 karakter. */
export function mosqueInfoFrom(s: SiteSettings): MosqueInfo {
  const first = parseRichText(s.profile_content ?? "").find(
    (b) => b.type === "p" && !(/^assalamu/i.test(b.text) && b.text.length < 80),
  );
  let summary = first && "text" in first ? first.text.replace(/\*+/g, "") : "";
  if (summary.length > 220) summary = `${summary.slice(0, 217).replace(/\s+\S*$/, "")}…`;
  return {
    name: s.mosque_name,
    tagline: s.tagline,
    summary,
    address: s.address,
    photo: publicMediaUrl(s.hero_image_path),
  };
}

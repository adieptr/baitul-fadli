import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { BookOpen, ChevronDown, HandHeart, History, ListChecks, Sparkles, Target, Users } from "lucide-react";
import { inline, parseRichText, type Block } from "./rich-text";

/**
 * Menampilkan artikel profil (satu teks yang diedit admin) secara terstruktur:
 * pembuka singkat + Visi menonjol, bagian lain sebagai akordeon yang ringkas di HP.
 * Tampilan tiap bagian menyesuaikan isinya (garis waktu, kartu, label nama).
 */

type Section = { title: string; blocks: Block[] };

function splitSections(content: string) {
  const intro: Block[] = [];
  const sections: Section[] = [];
  for (const b of parseRichText(content)) {
    if (b.type === "h2") sections.push({ title: b.text, blocks: [] });
    else if (sections.length) sections[sections.length - 1].blocks.push(b);
    else intro.push(b);
  }
  return { intro, sections };
}

/** "**Judul** — isi" / "**Judul:** isi" → { lead, rest } */
function splitLead(item: string): { lead: string | null; rest: string } {
  const m = /^\*\*([^*]+?):?\*\*:?\s*(?:[—–-]\s*)?(.*)$/.exec(item.trim());
  if (!m) return { lead: null, rest: item };
  const rest = m[2].trim();
  // Awali deskripsi dengan huruf kapital agar rapi ("peletakan…" → "Peletakan…")
  return { lead: m[1].trim(), rest: rest.replace(/^([a-z])/, (c) => c.toUpperCase()) };
}

const ICONS: Array<[RegExp, LucideIcon]> = [
  [/sejarah|riwayat/i, History],
  [/visi/i, Target],
  [/misi|fungsi/i, ListChecks],
  [/program|kegiatan/i, Sparkles],
  [/pengurus|takmir|struktur/i, Users],
];
const iconFor = (t: string) => ICONS.find(([re]) => re.test(t))?.[1] ?? BookOpen;

const isVision = (t: string) => /^visi$/i.test(t.trim());
const isCta = (t: string) => /^(mari|ajakan|bergabung)/i.test(t.trim());
const isPeople = (t: string) => /pengurus|takmir|struktur/i.test(t);
const isTimelineTitle = (t: string) => /tonggak|linimasa|timeline|perjalanan/i.test(t);

function Paragraph({ text }: { text: string }) {
  return <p className="leading-relaxed text-slate-700">{inline(text)}</p>;
}

function Quote({ text }: { text: string }) {
  return (
    <blockquote className="rounded-r-lg border-l-4 border-accent-500 bg-accent-100/50 px-4 py-3 text-sm text-slate-700 italic">
      {inline(text)}
    </blockquote>
  );
}

function Timeline({ items }: { items: string[] }) {
  return (
    <ol className="relative ml-1.5 space-y-4 border-l-2 border-brand-100 pl-5">
      {items.map((it, i) => {
        const { lead, rest } = splitLead(it);
        return (
          <li key={i} className="relative">
            <span className="absolute top-1.5 -left-[1.6rem] size-3 rounded-full border-2 border-white bg-brand-600 ring-2 ring-brand-100" aria-hidden />
            {lead && <p className="text-sm font-bold text-brand-800">{lead}</p>}
            <p className="text-sm text-slate-700">{inline(rest)}</p>
          </li>
        );
      })}
    </ol>
  );
}

function LeadCards({ items, numbered }: { items: string[]; numbered: boolean }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((it, i) => {
        const { lead, rest } = splitLead(it);
        return (
          <li key={i} className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            {numbered && (
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white">
                {i + 1}
              </span>
            )}
            <div className="min-w-0">
              {lead && <p className="text-sm font-semibold text-slate-900">{lead}</p>}
              <p className="text-sm text-slate-600">{inline(rest)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function PeopleGroups({ items }: { items: string[] }) {
  return (
    <dl className="space-y-4">
      {items.map((it, i) => {
        const { lead, rest } = splitLead(it);
        const names = rest.split(/,\s*/).filter(Boolean);
        return (
          <div key={i}>
            {lead && <dt className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">{lead}</dt>}
            <dd className="flex flex-wrap gap-2">
              {names.map((n) => (
                <span key={n} className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-sm font-medium text-brand-900">
                  {n}
                </span>
              ))}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

function PlainList({ items, ordered }: { items: string[]; ordered: boolean }) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag className={ordered ? "list-decimal space-y-1.5 pl-5 text-sm text-slate-700" : "space-y-1.5 text-sm text-slate-700"}>
      {items.map((it, i) => (
        <li key={i} className={ordered ? "" : "flex gap-2.5"}>
          {!ordered && <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-600" aria-hidden />}
          <span>{inline(it)}</span>
        </li>
      ))}
    </Tag>
  );
}

function SectionBody({ section }: { section: Section }) {
  return (
    <div className="space-y-4">
      {section.blocks.map((b, i) => {
        const prev = section.blocks[i - 1];
        const timelineNext = prev?.type === "h3" && isTimelineTitle(prev.text);
        if (b.type === "h3") {
          return <h4 key={i} className="pt-2 text-sm font-bold text-slate-900">{inline(b.text)}</h4>;
        }
        if (b.type === "p") return <Paragraph key={i} text={b.text} />;
        if (b.type === "quote") return <Quote key={i} text={b.text} />;
        if (b.type === "ul" || b.type === "ol") {
          const withLeads = b.items.every((it) => splitLead(it).lead);
          if (isPeople(section.title) && withLeads) return <PeopleGroups key={i} items={b.items} />;
          if ((timelineNext || /sejarah/i.test(section.title)) && withLeads) return <Timeline key={i} items={b.items} />;
          if (withLeads) return <LeadCards key={i} items={b.items} numbered={b.type === "ol"} />;
          return <PlainList key={i} items={b.items} ordered={b.type === "ol"} />;
        }
        return null;
      })}
    </div>
  );
}

const plainText = (blocks: Block[]) =>
  blocks
    .filter((b): b is Extract<Block, { text: string }> => "text" in b)
    .map((b) => b.text)
    .join(" ")
    .replace(/\*/g, "");

export function ProfileContent({ content }: { content: string }) {
  const { intro, sections } = splitSections(content);
  // Salam pembuka sudah tampil di hero — jangan diulang.
  const introBlocks = intro.filter((b) => !(b.type === "p" && /^assalamu/i.test(b.text) && b.text.length < 80));
  const vision = sections.find((s) => isVision(s.title));
  const cta = sections.find((s) => isCta(s.title));
  const rest = sections.filter((s) => s !== vision && s !== cta);

  return (
    <div className="space-y-6">
      {introBlocks.length > 0 && (
        <div className="space-y-4 text-base">
          {introBlocks.map((b, i) =>
            b.type === "p" ? <Paragraph key={i} text={b.text} /> : b.type === "quote" ? <Quote key={i} text={b.text} /> : null,
          )}
        </div>
      )}

      {vision && (
        <div className="trim-top lattice-light relative overflow-hidden rounded-2xl bg-brand-900 p-6 text-white">
          <Target className="absolute -top-3 -right-3 size-24 text-white/5" aria-hidden />
          <p className="text-xs font-semibold tracking-wider text-accent-300 uppercase">Visi</p>
          <p className="mt-2 text-lg leading-snug font-semibold">{plainText(vision.blocks)}</p>
        </div>
      )}

      {rest.length > 0 && (
        <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {rest.map((s) => {
            const Icon = iconFor(s.title);
            return (
              <details key={s.title} className="group">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 select-none hover:bg-slate-50 sm:px-5 [&::-webkit-details-marker]:hidden">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="flex-1 font-semibold text-slate-900">{s.title}</span>
                  <ChevronDown className="size-5 text-slate-400 transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <div className="px-4 pt-1 pb-5 sm:px-5">
                  <SectionBody section={s} />
                </div>
              </details>
            );
          })}
        </div>
      )}

      {cta && (
        <div className="flex flex-col gap-4 rounded-2xl border border-accent-500/40 bg-accent-100/40 p-5 sm:flex-row sm:items-center">
          <HandHeart className="size-8 shrink-0 text-accent-700" aria-hidden />
          <div className="flex-1">
            <p className="font-semibold text-slate-900">{cta.title}</p>
            <p className="mt-1 text-sm text-slate-700">{inline(plainText(cta.blocks))}</p>
          </div>
          <Link
            href="/daftar"
            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Jadi Donatur
          </Link>
        </div>
      )}
    </div>
  );
}

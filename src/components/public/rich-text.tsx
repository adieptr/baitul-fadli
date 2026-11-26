import { Fragment, type ReactNode } from "react";

/**
 * Perender artikel sederhana & aman (tidak pernah memakai HTML mentah).
 * Format: "## Subjudul", "### Sub-subjudul", "- poin", "1. poin bernomor",
 * "> kutipan", **tebal**, *miring*, baris kosong = paragraf baru.
 */
function inline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g).filter(Boolean);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i} className="font-semibold text-slate-900">{p.slice(2, -2)}</strong>;
    if (p.startsWith("*") && p.endsWith("*") && p.length > 2) return <em key={i}>{p.slice(1, -1)}</em>;
    return <Fragment key={i}>{p}</Fragment>;
  });
}

type Block =
  | { type: "h2" | "h3" | "p" | "quote"; text: string }
  | { type: "ul" | "ol"; items: string[] };

export function parseRichText(src: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ type: "p", text: para.join(" ") });
    para = [];
  };
  for (const raw of src.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    const last = blocks[blocks.length - 1];
    if (line.startsWith("### ")) { flush(); blocks.push({ type: "h3", text: line.slice(4) }); }
    else if (line.startsWith("## ")) { flush(); blocks.push({ type: "h2", text: line.slice(3) }); }
    else if (line.startsWith("> ")) {
      flush();
      if (last?.type === "quote") last.text += ` ${line.slice(2)}`;
      else blocks.push({ type: "quote", text: line.slice(2) });
    } else if (/^[-*•] /.test(line)) {
      flush();
      if (last?.type === "ul") last.items.push(line.slice(2));
      else blocks.push({ type: "ul", items: [line.slice(2)] });
    } else if (/^\d+[.)] /.test(line)) {
      flush();
      const item = line.replace(/^\d+[.)] /, "");
      if (last?.type === "ol") last.items.push(item);
      else blocks.push({ type: "ol", items: [item] });
    } else para.push(line);
  }
  flush();
  return blocks;
}

export function RichText({ content, className }: { content: string; className?: string }) {
  const blocks = parseRichText(content);
  return (
    <div className={className}>
      {blocks.map((b, i) => {
        switch (b.type) {
          case "h2":
            return <h3 key={i} className="mt-8 mb-3 text-xl font-bold text-slate-900 first:mt-0">{inline(b.text)}</h3>;
          case "h3":
            return <h4 key={i} className="mt-6 mb-2 text-lg font-semibold text-slate-900">{inline(b.text)}</h4>;
          case "quote":
            return (
              <blockquote key={i} className="my-6 rounded-r-lg border-l-4 border-gold-500 bg-gold-100/50 px-5 py-4 text-slate-700 italic">
                {inline(b.text)}
              </blockquote>
            );
          case "ul":
            return (
              <ul key={i} className="my-4 space-y-2">
                {b.items.map((it, j) => (
                  <li key={j} className="flex gap-3">
                    <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-brand-600" aria-hidden />
                    <span>{inline(it)}</span>
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} className="my-4 list-decimal space-y-2 pl-6 marker:font-semibold marker:text-brand-700">
                {b.items.map((it, j) => <li key={j}>{inline(it)}</li>)}
              </ol>
            );
          default:
            return <p key={i} className="my-4 first:mt-0">{inline(b.text)}</p>;
        }
      })}
    </div>
  );
}

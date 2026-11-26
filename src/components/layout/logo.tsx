import Link from "next/link";

export function Logo({ name, light = false }: { name: string; light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3 rounded-lg" aria-label={`${name} — Beranda`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/icon-192.png" alt="" width={44} height={44} className="size-11 rounded-xl" />
      <span className={`text-lg leading-tight font-extrabold ${light ? "text-white" : "text-brand-900"}`}>{name}</span>
    </Link>
  );
}

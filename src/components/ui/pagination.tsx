import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonClass } from "./button";

export function Pagination({
  page,
  pageSize,
  total,
  baseParams,
  basePath,
}: {
  page: number;
  pageSize: number;
  total: number;
  baseParams: Record<string, string | undefined>;
  basePath: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    Object.entries(baseParams).forEach(([k, v]) => v && sp.set(k, v));
    sp.set("page", String(p));
    return `${basePath}?${sp.toString()}`;
  };
  return (
    <nav aria-label="Halaman" className="mt-6 flex items-center justify-between gap-3">
      {page > 1 ? (
        <Link href={href(page - 1)} className={buttonClass("secondary", "sm")}>
          <ChevronLeft className="size-4" aria-hidden /> Sebelumnya
        </Link>
      ) : (
        <span />
      )}
      <span className="text-slate-600">
        Halaman {page} dari {pages}
      </span>
      {page < pages ? (
        <Link href={href(page + 1)} className={buttonClass("secondary", "sm")}>
          Berikutnya <ChevronRight className="size-4" aria-hidden />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

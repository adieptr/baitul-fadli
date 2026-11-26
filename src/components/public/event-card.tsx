import Link from "next/link";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { formatDate, formatTime } from "@/lib/format";
import { publicMediaUrl } from "@/lib/storage";
import type { EventRow } from "@/lib/queries/public";

export function EventCard({ event }: { event: EventRow }) {
  const img = publicMediaUrl(event.image_path);
  const [y, m, d] = event.event_date.split("-");
  const month = new Intl.DateTimeFormat("id-ID", { month: "short", timeZone: "UTC" }).format(
    new Date(Date.UTC(Number(y), Number(m) - 1, Number(d))),
  );
  return (
    <Link
      href={`/agenda/${event.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
    >
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt="" loading="lazy" className="aspect-video w-full object-cover" />
      ) : (
        <div className="pattern-bg flex aspect-video items-center justify-center text-white">
          <div className="text-center">
            <div className="text-3xl font-extrabold">{Number(d)}</div>
            <div className="text-base font-semibold uppercase">{month} {y}</div>
          </div>
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="text-lg font-bold text-slate-900 group-hover:text-brand-800">{event.title}</h3>
        <p className="flex items-center gap-2 text-slate-700">
          <CalendarDays className="size-4 shrink-0 text-brand-700" aria-hidden /> {formatDate(event.event_date, { weekday: true })}
        </p>
        {event.start_time && (
          <p className="flex items-center gap-2 text-slate-700">
            <Clock className="size-4 shrink-0 text-brand-700" aria-hidden /> {formatTime(event.start_time)}
            {event.end_time ? ` – ${formatTime(event.end_time)}` : ""} WIB
          </p>
        )}
        {event.location && (
          <p className="flex items-center gap-2 text-slate-700">
            <MapPin className="size-4 shrink-0 text-brand-700" aria-hidden /> {event.location}
          </p>
        )}
      </div>
    </Link>
  );
}

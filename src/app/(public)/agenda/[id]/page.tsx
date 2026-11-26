import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock, MapPin } from "lucide-react";
import { formatDate, formatTime } from "@/lib/format";
import { publicMediaUrl } from "@/lib/storage";
import { getPublishedEvent } from "@/lib/queries/public";

export const revalidate = 60;
// Render saat pertama diminta lalu di-cache (ISR).
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const ev = await getPublishedEvent((await params).id);
  return { title: ev?.title ?? "Agenda" };
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ev = await getPublishedEvent((await params).id);
  if (!ev) notFound();
  const img = publicMediaUrl(ev.image_path);
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/agenda" className="mb-4 inline-flex min-h-10 items-center gap-2 font-semibold text-brand-800">
        <ArrowLeft className="size-4" aria-hidden /> Semua agenda
      </Link>
      {img && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt="" className="mb-6 aspect-video w-full rounded-xl object-cover" />
      )}
      <h1 className="text-2xl font-extrabold text-slate-900">{ev.title}</h1>
      <div className="mt-4 space-y-2 rounded-xl bg-brand-50 p-5 text-base text-slate-800">
        <p className="flex items-center gap-3">
          <CalendarDays className="size-5 text-brand-700" aria-hidden /> {formatDate(ev.event_date, { weekday: true })}
        </p>
        {ev.start_time && (
          <p className="flex items-center gap-3">
            <Clock className="size-5 text-brand-700" aria-hidden /> {formatTime(ev.start_time)}
            {ev.end_time ? ` – ${formatTime(ev.end_time)}` : ""} WIB
          </p>
        )}
        {ev.location && (
          <p className="flex items-center gap-3">
            <MapPin className="size-5 text-brand-700" aria-hidden /> {ev.location}
          </p>
        )}
      </div>
      {ev.description && <p className="mt-6 whitespace-pre-line text-base leading-relaxed text-slate-800">{ev.description}</p>}
    </article>
  );
}

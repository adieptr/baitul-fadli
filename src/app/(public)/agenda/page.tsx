import { PageHeader, EmptyState } from "@/components/ui/card";
import { EventCard } from "@/components/public/event-card";
import { getPastEvents, getUpcomingEvents } from "@/lib/queries/public";

export const revalidate = 60;
export const metadata = { title: "Agenda Kegiatan" };

export default async function AgendaPage() {
  const [upcoming, past] = await Promise.all([getUpcomingEvents(30), getPastEvents(12)]);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <PageHeader title="Agenda Kegiatan" description="Kegiatan Masjid Baitul Fadli yang akan datang dan yang telah terlaksana." />
      <h2 className="mb-4 text-lg font-bold text-brand-900">Akan Datang</h2>
      {upcoming.length ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {upcoming.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      ) : (
        <EmptyState title="Belum ada agenda mendatang" />
      )}
      <h2 className="mt-12 mb-4 text-lg font-bold text-slate-700">Kegiatan Sebelumnya</h2>
      {past.length ? (
        <div className="grid gap-6 opacity-90 sm:grid-cols-2 lg:grid-cols-3">
          {past.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      ) : (
        <p className="text-slate-600">Belum ada.</p>
      )}
    </div>
  );
}

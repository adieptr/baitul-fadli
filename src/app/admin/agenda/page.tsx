import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flash } from "@/components/ui/flash";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { formatDate, formatTime } from "@/lib/format";
import { jakartaToday } from "@/lib/schedule";
import type { Database } from "@/lib/database.types";

type EventRow = Database["public"]["Tables"]["events"]["Row"];

function EventList({ rows }: { rows: EventRow[] }) {
  return (
    <ul className="space-y-3">
      {rows.map((e) => (
        <li key={e.id}>
          <Link href={`/admin/agenda/${e.id}`} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 hover:border-brand-600">
            <CalendarDays className="size-8 shrink-0 text-brand-700" aria-hidden />
            <div className="flex-1">
              <p className="font-bold">{e.title}</p>
              <p className="text-sm text-slate-600">
                {formatDate(e.event_date, { weekday: true })} {e.start_time && `· ${formatTime(e.start_time)} WIB`} {e.location && `· ${e.location}`}
              </p>
            </div>
            <Badge tone={e.is_published ? "success" : "neutral"}>{e.is_published ? "Terbit" : "Draf"}</Badge>
          </Link>
        </li>
      ))}
    </ul>
    );
}

export const metadata = { title: "Agenda Kegiatan" };

export default async function EventsAdminPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const supabase = await createClient();
  const today = jakartaToday();
  const [{ data: upcoming }, { data: past }] = await Promise.all([
    supabase.from("events").select("*").gte("event_date", today).order("event_date").limit(100),
    supabase.from("events").select("*").lt("event_date", today).order("event_date", { ascending: false }).limit(30),
  ]);

  return (
    <div className="space-y-6">
      <Flash params={sp} />
      <PageHeader
        title="Agenda Kegiatan"
        action={
          <LinkButton href="/admin/agenda/baru">
            <Plus className="size-4" aria-hidden /> Tambah Agenda
          </LinkButton>
        }
      />
      <h2 className="text-lg font-bold">Akan Datang</h2>
      {upcoming?.length ? <EventList rows={upcoming} /> : <EmptyState title="Belum ada agenda mendatang" />}
      <h2 className="pt-4 text-lg font-bold text-slate-700">Sudah Lewat</h2>
      {past?.length ? <EventList rows={past} /> : <p className="text-slate-600">Belum ada.</p>}
    </div>
  );
}

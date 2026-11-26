import { Card, PageHeader } from "@/components/ui/card";
import { EventForm } from "@/components/admin/event-form";
import { requireAdmin } from "@/lib/auth";
import { jakartaToday } from "@/lib/schedule";

export const metadata = { title: "Tambah Agenda" };

export default async function NewEventPage() {
  await requireAdmin();
  return (
    <div className="max-w-2xl">
      <PageHeader title="Tambah Agenda" />
      <Card>
        <EventForm today={jakartaToday()} />
      </Card>
    </div>
  );
}

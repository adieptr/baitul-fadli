import { Card, PageHeader } from "@/components/ui/card";
import { TransactionForm } from "@/components/admin/transaction-form";
import { requireAdmin } from "@/lib/auth";
import { getCategories } from "@/lib/queries/admin";
import { jakartaToday } from "@/lib/schedule";

export const metadata = { title: "Catat Transaksi" };

export default async function NewTransactionPage() {
  await requireAdmin();
  const categories = await getCategories();
  return (
    <div className="max-w-2xl">
      <PageHeader title="Catat Transaksi" description="Isi data transaksi dengan teliti. Setiap perubahan tercatat di log." />
      <Card>
        <TransactionForm categories={categories} today={jakartaToday()} />
      </Card>
    </div>
  );
}

import { Badge } from "@/components/ui/badge";
import { ACCOUNT_LABEL } from "@/lib/accounts";
import { formatRupiah } from "@/lib/format";

/** Nominal & cara bayar yang dikonfirmasi donatur, dibandingkan dengan tagihan. */
export function PaymentDeclared({
  billed,
  paid,
  account,
}: {
  billed: number | string;
  paid: number | string | null | undefined;
  account: string | null | undefined;
}) {
  if (paid == null) return null;
  const diff = Number(paid) - Number(billed);
  return (
    <p className="flex flex-wrap items-center gap-2">
      <span>
        Donatur memberi <b className="tabular-nums">{formatRupiah(paid)}</b>
        {account ? ` · ${ACCOUNT_LABEL[account] ?? account}` : ""}
      </span>
      {diff > 0 && <Badge tone="success">Lebih {formatRupiah(diff)}</Badge>}
      {diff < 0 && <Badge tone="warning">Kurang {formatRupiah(-diff)}</Badge>}
      {diff === 0 && <Badge tone="info">Sesuai tagihan</Badge>}
    </p>
  );
}

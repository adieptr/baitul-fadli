import { describe, expect, it } from "vitest";
import { subscriptionSchema, transactionSchema, registerSchema, eventSchema } from "../src/lib/validation";
import { nextDueDate } from "../src/lib/schedule";
import { formatPeriodKey } from "../src/lib/format";

describe("subscriptionSchema", () => {
  it("menerima donasi bulanan tanpa field hari (field tidak dikirim)", () => {
    const r = subscriptionSchema.safeParse({ amount: "100.000", frequency: "monthly", day_of_month: "26" });
    expect(r.success).toBe(true);
    expect(r.data).toEqual({ amount: 100000, frequency: "monthly", day_of_month: 26, day_of_week: null });
  });
  it("mewajibkan hari untuk mingguan", () => {
    const r = subscriptionSchema.safeParse({ amount: "50000", frequency: "weekly" });
    expect(r.success).toBe(false);
  });
  it("menolak nominal di bawah Rp1.000 dan tanggal > 28", () => {
    expect(subscriptionSchema.safeParse({ amount: "500", frequency: "monthly", day_of_month: "5" }).success).toBe(false);
    expect(subscriptionSchema.safeParse({ amount: "5000", frequency: "monthly", day_of_month: "31" }).success).toBe(false);
  });
});

describe("transactionSchema", () => {
  const base = {
    type: "income",
    category_id: "6f1e7a52-1c1a-4b7e-9a37-3f0b7d1f2a11",
    amount: "1.500.000",
    transaction_date: "2026-10-15",
    description: "Infaq Jumat",
  };
  it("parse nominal berformat ribuan", () => {
    const r = transactionSchema.safeParse(base);
    expect(r.success && r.data.amount).toBe(1500000);
    expect(r.success && r.data.proof_path).toBe(null);
  });
  it("menolak path file berbahaya", () => {
    expect(transactionSchema.safeParse({ ...base, proof_path: "../../etc/passwd" }).success).toBe(false);
  });
});

describe("registerSchema", () => {
  it("menormalkan nomor HP & email", () => {
    const r = registerSchema.safeParse({
      full_name: " Ahmad ", phone: "0812-3456-7890", email: " A@B.COM ", password: "rahasia123", password_confirm: "rahasia123",
    });
    expect(r.success && r.data.phone).toBe("081234567890");
    expect(r.success && r.data.email).toBe("a@b.com");
  });
});

describe("eventSchema", () => {
  it("jam kosong menjadi null & checkbox dibaca", () => {
    const r = eventSchema.safeParse({ title: "Kajian", event_date: "2026-12-01", start_time: "", is_published: "on" });
    expect(r.success && r.data.start_time).toBe(null);
    expect(r.success && r.data.is_published).toBe(true);
  });
});

describe("nextDueDate (konsisten dengan SQL cycle_due_date)", () => {
  it("bulanan: hari ini jika tanggal sama, bulan depan jika lewat", () => {
    expect(nextDueDate({ frequency: "monthly", day_of_week: null, day_of_month: 26 }, "2026-11-26")).toBe("2026-11-26");
    expect(nextDueDate({ frequency: "monthly", day_of_week: null, day_of_month: 5 }, "2026-11-26")).toBe("2026-12-05");
    expect(nextDueDate({ frequency: "monthly", day_of_week: null, day_of_month: 5 }, "2026-12-26")).toBe("2027-01-05");
  });
  it("mingguan: hari ISO (1=Senin, 5=Jumat)", () => {
    // 2026-11-26 = Kamis
    expect(nextDueDate({ frequency: "weekly", day_of_week: 5, day_of_month: null }, "2026-11-26")).toBe("2026-11-27");
    expect(nextDueDate({ frequency: "weekly", day_of_week: 4, day_of_month: null }, "2026-11-26")).toBe("2026-11-26");
    expect(nextDueDate({ frequency: "weekly", day_of_week: 1, day_of_month: null }, "2026-11-26")).toBe("2026-11-30");
  });
});

describe("formatPeriodKey", () => {
  it("label periode", () => {
    expect(formatPeriodKey("2026-11")).toBe("November 2026");
    expect(formatPeriodKey("2026-W48")).toBe("Pekan ke-48 tahun 2026");
  });
});

import { identifierSchema, normalizePhone } from "../src/lib/validation";

describe("login dengan nomor HP", () => {
  it("normalisasi format nomor Indonesia", () => {
    expect(normalizePhone("+62 812-3456-7890")).toBe("081234567890");
    expect(normalizePhone("6281234567890")).toBe("081234567890");
    expect(normalizePhone("0812 3456 7890")).toBe("081234567890");
  });
  it("membedakan email dan nomor HP", () => {
    expect(identifierSchema.parse("Ahmad@Contoh.test")).toEqual({ kind: "email", value: "ahmad@contoh.test" });
    expect(identifierSchema.parse("+62 812 3456 7890")).toEqual({ kind: "phone", value: "081234567890" });
    expect(identifierSchema.safeParse("12345").success).toBe(false);
  });
});

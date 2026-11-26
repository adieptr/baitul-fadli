import { z } from "zod";

const emptyToNull = (v: unknown) => (v === undefined || (typeof v === "string" && v.trim() === "") ? null : v);

/** Samakan format nomor HP Indonesia: +62812… / 62812… / 0812-… → 0812… */
export function normalizePhone(v: string): string {
  const x = v.replace(/[^0-9+]/g, "");
  return /^\+?62/.test(x) ? `0${x.replace(/^\+?62/, "")}` : x;
}

export const phoneSchema = z
  .string()
  .trim()
  .transform(normalizePhone)
  .refine((v) => /^0[0-9]{8,15}$/.test(v), "Nomor HP tidak valid. Contoh: 081234567890");

export const passwordSchema = z
  .string()
  .min(8, "Kata sandi minimal 8 karakter.")
  .max(72, "Kata sandi maksimal 72 karakter.");

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Alamat email tidak valid."));

export const registerSchema = z
  .object({
    full_name: z.string().trim().min(3, "Nama lengkap minimal 3 huruf.").max(120),
    phone: phoneSchema,
    email: emailSchema,
    password: passwordSchema,
    password_confirm: z.string(),
    // honeypot anti-bot: harus kosong
    website: z.string().max(0).optional(),
  })
  .refine((d) => d.password === d.password_confirm, {
    path: ["password_confirm"],
    message: "Konfirmasi kata sandi tidak sama.",
  });

/** Login memakai email ATAU nomor HP. */
export const identifierSchema = z
  .string()
  .trim()
  .min(1, "Isi email atau nomor HP.")
  .max(120)
  .transform((v, ctx) => {
    if (v.includes("@")) {
      const r = emailSchema.safeParse(v);
      if (!r.success) {
        ctx.addIssue({ code: "custom", message: "Alamat email tidak valid." });
        return z.NEVER;
      }
      return { kind: "email" as const, value: r.data };
    }
    const phone = normalizePhone(v);
    if (!/^0[0-9]{8,15}$/.test(phone)) {
      ctx.addIssue({ code: "custom", message: "Nomor HP tidak valid. Contoh: 081234567890" });
      return z.NEVER;
    }
    return { kind: "phone" as const, value: phone };
  });

export const loginSchema = z.object({
  identifier: identifierSchema,
  password: z.string().min(1, "Kata sandi wajib diisi."),
});

export const profileSchema = z.object({
  full_name: z.string().trim().min(3, "Nama lengkap minimal 3 huruf.").max(120),
  phone: phoneSchema,
});

export const newPasswordSchema = z
  .object({ password: passwordSchema, password_confirm: z.string() })
  .refine((d) => d.password === d.password_confirm, {
    path: ["password_confirm"],
    message: "Konfirmasi kata sandi tidak sama.",
  });

const amountSchema = z.preprocess(
  (v) => (typeof v === "string" ? v.replace(/[^0-9]/g, "") : v),
  z.coerce
    .number({ message: "Nominal wajib diisi." })
    .int("Nominal harus bilangan bulat.")
    .positive("Nominal harus lebih dari 0."),
);

export const subscriptionSchema = z
  .object({
    amount: amountSchema.pipe(z.number().min(1000, "Nominal minimal Rp1.000.").max(1_000_000_000)),
    frequency: z.enum(["weekly", "monthly"], { message: "Pilih jadwal donasi." }),
    day_of_week: z.preprocess(emptyToNull, z.coerce.number().int().min(1).max(7).nullable()),
    day_of_month: z.preprocess(emptyToNull, z.coerce.number().int().min(1).max(28).nullable()),
  })
  .superRefine((d, ctx) => {
    if (d.frequency === "weekly" && !d.day_of_week)
      ctx.addIssue({ code: "custom", path: ["day_of_week"], message: "Pilih hari pengingat." });
    if (d.frequency === "monthly" && !d.day_of_month)
      ctx.addIssue({ code: "custom", path: ["day_of_month"], message: "Pilih tanggal pengingat (1–28)." });
  })
  .transform((d) => ({
    ...d,
    day_of_week: d.frequency === "weekly" ? d.day_of_week : null,
    day_of_month: d.frequency === "monthly" ? d.day_of_month : null,
  }));

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid.");
const timeSchema = z.preprocess(
  emptyToNull,
  z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Jam tidak valid.").nullable(),
);
const storagePath = z.preprocess(
  emptyToNull,
  z
    .string()
    .max(300)
    .regex(/^[a-zA-Z0-9/_\-.]+$/, "Nama file tidak valid.")
    .refine((v) => !v.includes(".."), "Nama file tidak valid.")
    .nullable(),
);

export const transactionSchema = z.object({
  type: z.enum(["income", "expense"], { message: "Pilih jenis transaksi." }),
  category_id: z.uuid("Pilih kategori."),
  amount: amountSchema.pipe(z.number().max(100_000_000_000, "Nominal terlalu besar.")),
  transaction_date: dateSchema,
  description: z.string().trim().min(3, "Keterangan minimal 3 karakter.").max(500),
  proof_path: storagePath,
});

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Nama kategori minimal 2 karakter.").max(80),
  type: z.enum(["income", "expense"]),
  sort_order: z.preprocess(emptyToNull, z.coerce.number().int().min(0).max(999).nullable()),
});

export const reportSchema = z
  .object({
    title: z.string().trim().min(3, "Judul minimal 3 karakter.").max(150),
    period_start: dateSchema,
    period_end: dateSchema,
    notes: z.string().trim().max(3000).default(""),
  })
  .refine((d) => d.period_end >= d.period_start, {
    path: ["period_end"],
    message: "Tanggal akhir harus setelah tanggal awal.",
  });

export const eventSchema = z
  .object({
    title: z.string().trim().min(3, "Judul minimal 3 karakter.").max(150),
    description: z.string().trim().max(5000).default(""),
    event_date: dateSchema,
    start_time: timeSchema,
    end_time: timeSchema,
    location: z.string().trim().max(200).default(""),
    image_path: storagePath,
    is_published: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  })
  .refine((d) => !d.start_time || !d.end_time || d.end_time >= d.start_time, {
    path: ["end_time"],
    message: "Jam selesai harus setelah jam mulai.",
  });

export const programSchema = z.object({
  title: z.string().trim().min(3, "Judul minimal 3 karakter.").max(120),
  description: z.string().trim().max(3000).default(""),
  target_amount: z.preprocess(
    (v) => (typeof v === "string" ? (v.replace(/[^0-9]/g, "") || null) : v),
    z.coerce.number().int().positive().nullable(),
  ),
  is_active: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  sort_order: z.preprocess(emptyToNull, z.coerce.number().int().min(0).max(999).nullable()),
});

export const settingsSchema = z.object({
  mosque_name: z.string().trim().min(3).max(120),
  tagline: z.string().trim().max(200).default(""),
  welcome_message: z.string().trim().max(2000).default(""),
  history: z.string().trim().max(5000).default(""),
  vision: z.string().trim().max(2000).default(""),
  mission: z.string().trim().max(3000).default(""),
  address: z.string().trim().max(500).default(""),
  phone: z.string().trim().max(30).default(""),
  whatsapp: z.string().trim().max(30).default(""),
  email: z.union([z.literal(""), emailSchema]).default(""),
  maps_url: z
    .string()
    .trim()
    .max(1000)
    .refine((v) => v === "" || v.startsWith("https://"), "Link harus diawali https://")
    .default(""),
  payment_info: z.string().trim().max(2000).default(""),
});

export const periodStatusSchema = z.object({
  period_id: z.uuid(),
  status: z.enum(["pending", "awaiting_verification", "paid", "unpaid"]),
  admin_note: z.preprocess(emptyToNull, z.string().trim().max(300).nullable()),
  record_income: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
});

export const confirmPaymentSchema = z.object({
  period_id: z.uuid(),
  note: z.preprocess(emptyToNull, z.string().trim().max(300, "Catatan maksimal 300 karakter.").nullable()),
  proof_path: storagePath,
});

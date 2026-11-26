"use client";

import {
  createContext,
  startTransition,
  use,
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { initialState, type ActionState } from "@/lib/action-state";
import { Button } from "./button";
import { toast } from "./toast";

type FormCtx = { state: ActionState; pending: boolean };
const FormContext = createContext<FormCtx>({ state: initialState, pending: false });

export function useFormCtx() {
  return use(FormContext);
}

/**
 * Form yang terhubung ke Server Action. Nilai isian TIDAK dihapus saat gagal
 * validasi (penting untuk kenyamanan pengguna), menampilkan pesan hasil, dan
 * mendukung reset/refresh saat berhasil.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  hideAlert = false,
  onSuccess,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  hideAlert?: boolean;
  onSuccess?: (state: ActionState) => void;
}) {
  // Toast dipicu saat respons tiba (sebelum render ulang), sehingga tetap
  // tampil walaupun form ini hilang dari halaman setelah data diperbarui.
  const [state, formAction, pending] = useActionState(async (prev: ActionState, fd: FormData) => {
    const result = await action(prev, fd);
    if (result?.ok) toast(result.message);
    return result;
  }, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!state.ts) return;
    if (state.ok) {
      if (resetOnSuccess) formRef.current?.reset();
      onSuccess?.(state);
      router.refresh();
    }
    // Arahkan fokus ke pesan agar pembaca layar & pengguna melihatnya
    formRef.current?.querySelector<HTMLElement>("[data-form-alert]")?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ts]);

  return (
    <FormContext value={{ state, pending }}>
      <form
        ref={formRef}
        className={className}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
          const fd = new FormData(e.currentTarget, submitter);
          startTransition(() => formAction(fd));
        }}
      >
        {!hideAlert && <FormAlert />}
        {children}
      </form>
    </FormContext>
  );
}

export function FormAlert({ className }: { className?: string }) {
  const { state } = useFormCtx();
  if (!state.message || state.ok) return null;
  return (
    <div
      data-form-alert
      tabIndex={-1}
      role={state.ok ? "status" : "alert"}
      className={cn(
        "mb-4 flex items-start gap-3 rounded-xl border-2 p-4 text-base outline-none",
        state.ok ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-red-300 bg-red-50 text-red-900",
        className,
      )}
    >
      {state.ok ? <CheckCircle2 className="mt-0.5 size-6 shrink-0" /> : <AlertCircle className="mt-0.5 size-6 shrink-0" />}
      <span>{state.message}</span>
    </div>
  );
}

export function SubmitButton({
  children,
  pendingText = "Memproses…",
  ...props
}: ComponentProps<typeof Button> & { pendingText?: string }) {
  const { pending } = useFormCtx();
  return (
    <Button type="submit" disabled={pending || props.disabled} aria-busy={pending} {...props}>
      {pending ? (
        <>
          <Loader2 className="size-5 animate-spin" aria-hidden /> {pendingText}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

const inputBase =
  "block w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-100 disabled:bg-slate-100";

function useFieldError(name?: string) {
  const { state } = useFormCtx();
  return name ? state.fieldErrors?.[name]?.[0] : undefined;
}

export function Field({
  label,
  name,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  name?: string;
  hint?: ReactNode;
  required?: boolean;
  children: (props: { id: string; "aria-invalid"?: boolean; "aria-describedby"?: string }) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const error = useFieldError(name);
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-err` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-base font-semibold text-slate-800">
        {label} {required && <span className="text-red-700" aria-hidden>*</span>}
      </label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-sm text-slate-600">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="flex items-center gap-1 text-sm font-medium text-red-700">
          <AlertCircle className="size-4" aria-hidden /> {error}
        </p>
      )}
    </div>
  );
}

export function TextField({
  label,
  hint,
  className,
  ...props
}: ComponentProps<"input"> & { label: string; hint?: ReactNode; name: string }) {
  return (
    <Field label={label} name={props.name} hint={hint} required={props.required} className={className}>
      {(a) => <input {...a} {...props} className={cn(inputBase, props.type === "date" && "min-h-[3.25rem]")} />}
    </Field>
  );
}

export function MoneyField({
  label,
  hint,
  defaultValue,
  ...props
}: Omit<ComponentProps<"input">, "defaultValue"> & { label: string; hint?: ReactNode; name: string; defaultValue?: number | string | null }) {
  const fmt = (v: string) => {
    const digits = v.replace(/[^0-9]/g, "");
    return digits ? Number(digits).toLocaleString("id-ID") : "";
  };
  const [value, setValue] = useState(defaultValue ? fmt(String(Math.round(Number(defaultValue)))) : "");
  return (
    <Field label={label} name={props.name} hint={hint} required={props.required}>
      {(a) => (
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center font-semibold text-slate-500">Rp</span>
          <input
            {...a}
            {...props}
            inputMode="numeric"
            autoComplete="off"
            value={value}
            onChange={(e) => setValue(fmt(e.target.value))}
            className={cn(inputBase, "pl-12 text-lg font-semibold tabular-nums")}
          />
        </div>
      )}
    </Field>
  );
}

export function SelectField({
  label,
  hint,
  options,
  placeholder,
  ...props
}: ComponentProps<"select"> & {
  label: string;
  hint?: ReactNode;
  name: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}) {
  return (
    <Field label={label} name={props.name} hint={hint} required={props.required}>
      {(a) => (
        <select {...a} {...props} className={cn(inputBase, "min-h-[3.25rem] appearance-auto")}>
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

export function TextAreaField({
  label,
  hint,
  ...props
}: ComponentProps<"textarea"> & { label: string; hint?: ReactNode; name: string }) {
  return (
    <Field label={label} name={props.name} hint={hint} required={props.required}>
      {(a) => <textarea rows={4} {...a} {...props} className={inputBase} />}
    </Field>
  );
}

export function CheckboxField({ label, hint, ...props }: ComponentProps<"input"> & { label: string; hint?: string }) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <input id={id} type="checkbox" {...props} className="mt-1 size-6 shrink-0 accent-brand-700" />
      <label htmlFor={id} className="text-base">
        <span className="font-semibold text-slate-800">{label}</span>
        {hint && <span className="block text-sm text-slate-600">{hint}</span>}
      </label>
    </div>
  );
}

/**
 * Tombol dengan dialog konfirmasi. Isian tambahan (children) ikut terkirim.
 * Harus diletakkan di dalam <ActionForm>.
 */
export function ConfirmButton({
  label,
  title,
  message,
  confirmLabel = "Ya, Lanjutkan",
  variant = "primary",
  size = "md",
  children,
  className,
  confirmName,
  confirmValue,
}: {
  label: ReactNode;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  variant?: "primary" | "danger" | "secondary" | "ghost" | "gold";
  size?: "sm" | "md" | "lg";
  children?: ReactNode;
  className?: string;
  confirmName?: string;
  confirmValue?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { pending, state } = useFormCtx();
  const titleId = useId();

  useEffect(() => {
    if (state.ts && ref.current?.open && state.ok) ref.current.close();
  }, [state.ts, state.ok]);

  return (
    <>
      <Button type="button" variant={variant} size={size} className={className} onClick={() => ref.current?.showModal()}>
        {label}
      </Button>
      <dialog
        ref={ref}
        aria-labelledby={titleId}
        className="m-auto w-[min(92vw,32rem)] rounded-2xl p-0 shadow-2xl"
      >
        <div className="space-y-4 p-6">
          <h2 id={titleId} className="text-xl font-bold text-slate-900">
            {title}
          </h2>
          <div className="text-base text-slate-700">{message}</div>
          {children}
          {state.message && !state.ok && <FormAlert className="mb-0" />}
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => ref.current?.close()}>
              Batal
            </Button>
            <SubmitButton variant={variant === "danger" ? "danger" : "primary"} name={confirmName} value={confirmValue} disabled={pending}>
              {confirmLabel}
            </SubmitButton>
          </div>
        </div>
      </dialog>
    </>
  );
}

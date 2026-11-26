"use client";

import { useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Field } from "./form";

export function PasswordField({ label, hint, ...props }: ComponentProps<"input"> & { label: string; name: string; hint?: string }) {
  const [show, setShow] = useState(false);
  return (
    <Field label={label} name={props.name} hint={hint} required={props.required}>
      {(a) => (
        <div className="relative">
          <input
            {...a}
            {...props}
            type={show ? "text" : "password"}
            className="block w-full rounded-xl border border-slate-300 bg-white py-2 pr-12 pl-3 text-base focus:border-brand-700 focus:ring-4 focus:ring-brand-100 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute inset-y-0 right-1 my-1 flex w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
            aria-label={show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      )}
    </Field>
  );
}

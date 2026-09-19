"use client";

import { useActionState } from "react";
import { ConfirmButton } from "./ConfirmButton";

/** A destructive action behind a confirmation dialog. `run` returns an error message, or redirects on success. */
export function DeleteButton({ run, label, confirmText }: { run: () => Promise<string | null>; label: string; confirmText: string }) {
  const [error, action, pending] = useActionState(async () => run(), null);
  return (
    <form action={action} className="delete-form">
      <ConfirmButton
        className="btn ghost sm danger-text"
        title="אישור מחיקה"
        message={confirmText}
        confirmLabel="מחיקה"
        danger
        disabled={pending}
      >
        {label}
      </ConfirmButton>
      {error && <p className="error row-error" role="alert">{error}</p>}
    </form>
  );
}

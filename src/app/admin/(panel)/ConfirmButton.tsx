"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  children: React.ReactNode;
  /** Text shown in the dialog. A function receives the form so it can read what was typed. */
  message: string | ((form: HTMLFormElement) => string);
  title?: string;
  confirmLabel?: string;
  /** Styles the confirm button as destructive. */
  danger?: boolean;
  className?: string;
  name?: string;
  value?: string;
  disabled?: boolean;
};

/**
 * A submit button that first asks for confirmation in a modal dialog.
 * On confirm it submits its own form, using itself as the submitter so name/value are sent.
 * Native validation runs first, so an empty required field never reaches the dialog.
 */
export function ConfirmButton({ children, message, title = "אישור פעולה", confirmLabel = "אישור", danger, className, name, value, disabled }: Props) {
  const button = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  function ask(e: React.MouseEvent) {
    // Stay a real submit button (requestSubmit needs one as submitter) but hold the submit for the dialog.
    e.preventDefault();
    const form = button.current?.form;
    if (!form || !form.reportValidity()) return;
    setText(typeof message === "function" ? message(form) : message);
    setOpen(true);
  }

  function confirm() {
    setOpen(false);
    const b = button.current;
    b?.form?.requestSubmit(b);
  }

  return (
    <>
      <button ref={button} type="submit" className={className} name={name} value={value} disabled={disabled} onClick={ask}>
        {children}
      </button>
      <dialog ref={dialog} className="confirm-dialog" onClose={() => setOpen(false)} aria-labelledby="confirm-title">
        <h2 id="confirm-title">{title}</h2>
        <p>{text}</p>
        <div className="confirm-actions">
          <button type="button" className={danger ? "btn danger" : "btn"} onClick={confirm} autoFocus>{confirmLabel}</button>
          <button type="button" className="btn ghost" onClick={() => setOpen(false)}>ביטול</button>
        </div>
      </dialog>
    </>
  );
}

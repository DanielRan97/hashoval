"use client";

import { useActionState, useState } from "react";
import { WISHLIST_MAX_LENGTH, checkFragranceName } from "@/lib/wishlist";
import { submitWishlist, type WishlistState } from "./actions";

export function WishlistForm() {
  const [state, dispatch, pending] = useActionState<WishlistState, FormData>(submitWishlist, null);
  const [value, setValue] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  // after a successful send the box is emptied for the next wish (adjusted while rendering, when a new result arrives)
  const [seen, setSeen] = useState<WishlistState>(null);
  if (state !== seen) {
    setSeen(state);
    if (state?.ok) setValue("");
  }

  const error = localError ?? (state && !state.ok ? state.message ?? null : null);

  return (
    <form
      className="wish-form"
      noValidate
      action={(fd) => {
        // the same check the server makes, so a bad entry is caught before it is sent
        const check = checkFragranceName(fd.get("fragranceName"));
        if (!check.ok) return setLocalError(check.error);
        setLocalError(null);
        dispatch(fd);
      }}
    >
      <label htmlFor="wish-name">שם הבושם</label>
      <input
        id="wish-name"
        name="fragranceName"
        type="text"
        value={value}
        maxLength={WISHLIST_MAX_LENGTH}
        placeholder="לדוגמה: YSL Babycat"
        autoComplete="off"
        aria-invalid={!!error}
        aria-describedby={error ? "wish-error" : undefined}
        onChange={(e) => {
          setValue(e.target.value);
          setLocalError(null);
        }}
      />
      {/* honeypot: hidden from people and from password managers */}
      <input type="text" name="hp_check_9k2" className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" data-lpignore data-1p-ignore data-form-type="other" />
      {error && <p id="wish-error" className="error" role="alert">{error}</p>}
      <button type="submit" className="btn" disabled={pending}>{pending ? "שולחים…" : "שלחו בקשה"}</button>
      {state?.ok && !error && value === "" && (
        <div className="wish-thanks" role="status">
          <strong>קיבלנו את הבקשה שלכם 💛</strong>
        </div>
      )}
    </form>
  );
}

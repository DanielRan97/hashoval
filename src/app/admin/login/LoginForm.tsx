"use client";

import { useActionState } from "react";
import { login } from "../actions";

export function LoginForm() {
  const [error, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="form">
      <label>
        סיסמה
        <input type="password" name="password" required autoFocus />
      </label>
      {error && <p className="error">{error}</p>}
      <button className="btn" disabled={pending}>כניסה</button>
    </form>
  );
}

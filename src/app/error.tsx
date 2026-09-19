"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container prose message-page">
      <h1>משהו השתבש</h1>
      <p>לא הצלחנו לטעון את הדף. אפשר לנסות שוב, ואם זה חוזר, נסו מאוחר יותר.</p>
      <div className="actions">
        <button className="btn" onClick={reset}>ניסיון נוסף</button>
        <Link href="/" className="btn ghost">לדף הבית</Link>
      </div>
    </div>
  );
}

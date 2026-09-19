"use client";

import "./globals.css";

/** Last-resort page when even the main layout fails. Replaces the whole document, so it needs its own html and body. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <div className="container prose message-page">
          <h1>משהו השתבש</h1>
          <p>האתר לא הצליח להיטען. אפשר לנסות שוב בעוד רגע.</p>
          <button className="btn" onClick={reset}>ניסיון נוסף</button>
        </div>
      </body>
    </html>
  );
}

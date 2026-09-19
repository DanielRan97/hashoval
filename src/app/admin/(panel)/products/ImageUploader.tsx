"use client";

import { useEffect, useState } from "react";
import { MAX_IMAGES } from "@/lib/imageUrls";

/**
 * Several photos per product. Each file is uploaded as soon as it is chosen; the form only submits
 * the resulting list of URLs (in order, the first is the main photo).
 */
export function ImageUploader({ initial, onBusyChange }: { initial: string[]; onBusyChange: (busy: boolean) => void }) {
  const [urls, setUrls] = useState(initial);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => onBusyChange(busy > 0), [busy, onBusyChange]);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    const room = MAX_IMAGES - urls.length;
    const chosen = [...files].slice(0, Math.max(0, room));
    if (files.length > room) setError(`אפשר עד ${MAX_IMAGES} תמונות לבושם`);
    setBusy((n) => n + chosen.length);
    const results = await Promise.allSettled(
      chosen.map(async (file) => {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/admin/upload", { method: "POST", body });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error ?? "ההעלאה נכשלה");
        return json.url as string;
      }),
    );
    const ok = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    const failed = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
    if (failed) setError(failed.reason instanceof Error ? failed.reason.message : "ההעלאה נכשלה");
    setUrls((prev) => [...prev, ...ok]);
    setBusy((n) => n - chosen.length);
  }

  return (
    <div className="uploader">
      <span className="uploader-label">תמונות (הראשונה היא הראשית; בחנות עוברים ביניהן עם העכבר)</span>
      <input type="hidden" name="imageUrls" value={JSON.stringify(urls)} />
      <div className="upload-thumbs">
        {urls.map((url, i) => (
          <div key={url} className="upload-thumb">
            <img src={url} alt="" />
            {i === 0 && <span className="upload-main">ראשית</span>}
            <div className="upload-actions">
              {i > 0 && (
                <button type="button" onClick={() => setUrls((u) => [url, ...u.filter((x) => x !== url)])}>
                  הפוך לראשית
                </button>
              )}
              <button type="button" onClick={() => setUrls((u) => u.filter((x) => x !== url))}>הסרה</button>
            </div>
          </div>
        ))}
        {busy > 0 && <div className="upload-thumb upload-busy" role="status">מעלה…</div>}
      </div>
      {urls.length < MAX_IMAGES && (
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            void upload(e.target.files);
            e.target.value = "";
          }}
        />
      )}
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}

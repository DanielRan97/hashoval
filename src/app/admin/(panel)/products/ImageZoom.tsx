"use client";

import { useEffect, useRef, useState } from "react";
import { Photo } from "@/app/(shop)/Gallery";
import { NO_FX, SHIFT_MAX, ZOOM_MAX, ZOOM_MIN, clampFx, type PhotoFx } from "@/lib/photoFx";
import { saveImageFx } from "../../actions";

export type EditableImage = { id: number; url: string } & PhotoFx;

/**
 * A small photo that opens large in a dialog. There the owner can frame each photo of the product:
 * drag it inside the square and set the zoom, exactly as it will look in the shop. The frame is the
 * same element the shop uses, so what is seen here is what customers get.
 */
export function ImageZoom({ images, fallbackUrl, alt }: { images: EditableImage[]; fallbackUrl: string | null; alt: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [fx, setFx] = useState<Record<number, PhotoFx>>(() => Object.fromEntries(images.map((i) => [i.id, { zoom: i.zoom, x: i.x, y: i.y }])));
  const [saved, setSaved] = useState<Record<number, PhotoFx>>(fx);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const drag = useRef<{ startX: number; startY: number; fromX: number; fromY: number } | null>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const thumbUrl = images[0]?.url ?? fallbackUrl;
  if (!thumbUrl) return null;
  const current = images[index];
  const cur = current ? fx[current.id] : NO_FX;
  const dirty = !!current && (cur.zoom !== saved[current.id].zoom || cur.x !== saved[current.id].x || cur.y !== saved[current.id].y);
  const set = (next: PhotoFx) => {
    if (!current) return;
    setMsg(null);
    setFx((f) => ({ ...f, [current.id]: clampFx(next) }));
  };

  return (
    <>
      <button type="button" className="zoom-thumb" onClick={() => setOpen(true)} aria-label={`הגדלת התמונה של ${alt}`}>
        <img className="thumb" src={thumbUrl} alt="" />
      </button>
      <dialog
        ref={dialog}
        className="zoom-dialog"
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false); // the dark area around the content
        }}
        aria-label={alt}
      >
        {open && (
          <>
            {current ? (
              <div
                ref={frame}
                className="gallery zoom-frame"
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  drag.current = { startX: e.clientX, startY: e.clientY, fromX: cur.x, fromY: cur.y };
                }}
                onPointerMove={(e) => {
                  const d = drag.current;
                  const box = frame.current?.getBoundingClientRect();
                  if (!d || !box) return;
                  set({ ...cur, x: d.fromX + ((e.clientX - d.startX) / box.width) * 100, y: d.fromY + ((e.clientY - d.startY) / box.height) * 100 });
                }}
                onPointerUp={() => (drag.current = null)}
                onPointerCancel={() => (drag.current = null)}
              >
                <Photo key={current.url} src={current.url} fx={cur} alt={alt} className="on" />
              </div>
            ) : (
              <div className="gallery zoom-frame">
                <img src={thumbUrl} alt={alt} className="on" />
              </div>
            )}
            {current && (
              <div className="zoom-tools">
                <label>
                  זום
                  <input type="range" min={ZOOM_MIN} max={ZOOM_MAX} step={0.01} value={cur.zoom} onChange={(e) => set({ ...cur, zoom: Number(e.target.value) })} />
                </label>
                <p className="muted zoom-hint">גררו את התמונה כדי למקם אותה. ההזזה מוגבלת ל-{SHIFT_MAX}% מהמסגרת.</p>
                <div className="zoom-buttons">
                  <button
                    type="button"
                    className="btn sm"
                    disabled={!dirty || saving}
                    onClick={async () => {
                      setSaving(true);
                      const err = await saveImageFx(current.id, cur.zoom, cur.x, cur.y);
                      setSaving(false);
                      if (err) return setMsg(err);
                      setSaved((s) => ({ ...s, [current.id]: cur }));
                      setMsg("נשמר");
                    }}
                  >
                    שמירה
                  </button>
                  <button type="button" className="btn ghost sm" onClick={() => set(NO_FX)}>
                    איפוס
                  </button>
                  {msg && (
                    <span className={msg === "נשמר" ? "muted" : "error"} role="status">
                      {msg}
                    </span>
                  )}
                </div>
              </div>
            )}
            {images.length > 1 && (
              <div className="zoom-thumbs" role="tablist" aria-label="תמונות המוצר">
                {images.map((im, i) => (
                  <button
                    key={im.id}
                    type="button"
                    role="tab"
                    aria-selected={i === index}
                    className={i === index ? "on" : undefined}
                    onClick={() => {
                      setIndex(i);
                      setMsg(null);
                    }}
                  >
                    <img src={im.url} alt="" />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        <button type="button" className="btn ghost sm" onClick={() => setOpen(false)}>
          סגירה
        </button>
      </dialog>
    </>
  );
}

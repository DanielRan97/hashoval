"use client";

import { useCallback, useRef, useState } from "react";
import { fxStyle, type PhotoData, type PhotoFx } from "@/lib/photoFx";
import { EmptyBottle } from "./ProductImage";

/** True when the photo has see-through corners (a cut-out on a transparent background). */
function hasTransparentCorners(img: HTMLImageElement) {
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 16;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return false;
    ctx.drawImage(img, 0, 0, 16, 16);
    return [0, 15].some((x) => [0, 15].some((y) => ctx.getImageData(x, y, 1, 1).data[3] < 250));
  } catch {
    return false;
  }
}

/**
 * A photo that is drawn a little smaller when its background is transparent. A cut-out bottle fills
 * the whole frame otherwise, which looks too close next to normal photos.
 */
export function Photo({ src, alt, className, eager, fx }: { src: string; alt: string; className?: string; eager?: boolean; fx?: PhotoFx }) {
  const [cutout, setCutout] = useState(false);
  const ref = useCallback((img: HTMLImageElement | null) => {
    if (!img) return;
    const check = () => setCutout(hasTransparentCorners(img));
    if (img.complete && img.naturalWidth > 0) check(); // already loaded before this ran
    else img.addEventListener("load", check, { once: true });
  }, []);
  return (
    <img
      ref={ref}
      src={src}
      alt={alt}
      className={[className, cutout ? "cutout" : ""].filter(Boolean).join(" ") || undefined}
      loading={eager === undefined ? undefined : eager ? "eager" : "lazy"}
      decoding="async"
      style={fxStyle(fx)}
      draggable={false}
    />
  );
}

/**
 * Swiping sideways on a touch screen: reports which way, and whether the last touch was a swipe (so the
 * tap that ends it does not also open the link the photo sits in). Reading direction is right to left,
 * so a swipe to the left goes to the next photo.
 */
function useSwipe(onNext: () => void, onPrev: () => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  return {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse") return;
      start.current = { x: e.clientX, y: e.clientY };
      swiped.current = false;
    },
    onPointerUp: (e: React.PointerEvent) => {
      const s = start.current;
      start.current = null;
      if (!s || e.pointerType === "mouse") return;
      const dx = e.clientX - s.x;
      if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(e.clientY - s.y)) {
        swiped.current = true;
        if (dx < 0) onNext();
        else onPrev();
      }
    },
    onClickCapture: (e: React.MouseEvent) => {
      if (swiped.current) {
        e.preventDefault();
        e.stopPropagation();
        swiped.current = false;
      }
    },
  };
}

/**
 * A product's photos, stacked and cross-faded. With `scrub`, moving the mouse across the image flips
 * through the photos (in reading direction); leaving returns to the main one. On a touch screen (no
 * hover) swiping sideways flips through them, and the dots show there is more than one.
 */
export function Gallery({ images, alt, scrub = false }: { images: PhotoData[]; alt: string; scrub?: boolean }) {
  const [index, setIndex] = useState(0);
  const n = images.length;
  const swipe = useSwipe(() => setIndex((i) => Math.min(n - 1, i + 1)), () => setIndex((i) => Math.max(0, i - 1)));
  if (images.length === 0) {
    return (
      <div className="gallery-empty">
        <EmptyBottle />
      </div>
    );
  }
  return (
    <div
      className="gallery"
      style={scrub && images.length > 1 ? { touchAction: "pan-y" } : undefined}
      {...(scrub && images.length > 1 ? swipe : {})}
      onPointerMove={
        scrub && images.length > 1
          ? (e) => {
              if (e.pointerType !== "mouse") return;
              const box = e.currentTarget.getBoundingClientRect();
              // the site reads right to left, so the photos advance as the mouse moves leftwards
              const ratio = Math.min(0.999, Math.max(0, (box.right - e.clientX) / box.width));
              setIndex(Math.floor(ratio * images.length));
            }
          : undefined
      }
      onPointerLeave={scrub ? (e) => { if (e.pointerType === "mouse") setIndex(0); } : undefined}
    >
      {images.map((img, i) => (
        <Photo key={img.url} src={img.url} fx={img} alt={i === 0 ? alt : ""} className={i === index ? "on" : undefined} eager={i === 0} />
      ))}
      {scrub && images.length > 1 && (
        <span className="gallery-dots" aria-hidden="true">
          {images.map((img, i) => <i key={img.url} className={i === index ? "on" : undefined} />)}
        </span>
      )}
    </div>
  );
}

/** The product page gallery: a large photo and thumbnails to choose from. */
export function ProductGallery({ images, alt }: { images: PhotoData[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const swipe = useSwipe(() => setIndex((i) => Math.min(images.length - 1, i + 1)), () => setIndex((i) => Math.max(0, i - 1)));
  return (
    <div className="product-gallery">
      <div className="gallery" style={images.length > 1 ? { touchAction: "pan-y" } : undefined} {...(images.length > 1 ? swipe : {})}>
        {images.length === 0 ? (
          <div className="gallery-empty"><EmptyBottle /></div>
        ) : (
          images.map((img, i) => <Photo key={img.url} src={img.url} fx={img} alt={i === index ? alt : ""} className={i === index ? "on" : undefined} />)
        )}
      </div>
      {images.length > 1 && (
        <div className="thumbs" role="tablist" aria-label="תמונות">
          {images.map((img, i) => (
            <button key={img.url} type="button" role="tab" aria-selected={i === index} className={i === index ? "on" : undefined} onClick={() => setIndex(i)}>
              <img src={img.url} alt="" draggable={false} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

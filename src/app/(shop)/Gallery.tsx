"use client";

import { useState } from "react";
import { EmptyBottle } from "./ProductImage";

/**
 * A product's photos, stacked and cross-faded. With `scrub`, moving the mouse across the image flips
 * through the photos (in reading direction); leaving returns to the main one. Touch screens keep the main one.
 */
export function Gallery({ images, alt, scrub = false }: { images: string[]; alt: string; scrub?: boolean }) {
  const [index, setIndex] = useState(0);
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
      onPointerLeave={scrub ? () => setIndex(0) : undefined}
    >
      {images.map((src, i) => (
        <img key={src} src={src} alt={i === 0 ? alt : ""} className={i === index ? "on" : undefined} loading={i === 0 ? "eager" : "lazy"} draggable={false} />
      ))}
      {scrub && images.length > 1 && (
        <span className="gallery-dots" aria-hidden="true">
          {images.map((src, i) => <i key={src} className={i === index ? "on" : undefined} />)}
        </span>
      )}
    </div>
  );
}

/** The product page gallery: a large photo and thumbnails to choose from. */
export function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  return (
    <div className="product-gallery">
      <div className="gallery">
        {images.length === 0 ? (
          <div className="gallery-empty"><EmptyBottle /></div>
        ) : (
          images.map((src, i) => <img key={src} src={src} alt={i === index ? alt : ""} className={i === index ? "on" : undefined} draggable={false} />)
        )}
      </div>
      {images.length > 1 && (
        <div className="thumbs" role="tablist" aria-label="תמונות">
          {images.map((src, i) => (
            <button key={src} type="button" role="tab" aria-selected={i === index} className={i === index ? "on" : undefined} onClick={() => setIndex(i)}>
              <img src={src} alt="" draggable={false} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect } from "react";

/**
 * Makes it a little harder to take the shop's photos: no right-click menu and no dragging on them.
 * This only stops casual saving. Anything shown on a screen can still be screenshotted, so it is a
 * deterrent, not protection.
 */
export function ProtectImages() {
  useEffect(() => {
    const onPhoto = (e: Event) => e.target instanceof Element && !!e.target.closest(".gallery, .showcase-photo, .thumbs, .card-media, .shop-search-thumb");
    const block = (e: Event) => {
      if (onPhoto(e) || (e.target instanceof HTMLImageElement && e.type === "dragstart")) e.preventDefault();
    };
    document.addEventListener("contextmenu", block);
    document.addEventListener("dragstart", block);
    return () => {
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("dragstart", block);
    };
  }, []);
  return null;
}

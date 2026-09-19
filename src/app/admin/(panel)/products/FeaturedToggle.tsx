"use client";

import { useTransition } from "react";
import { toggleFeatured } from "../../actions";

/** A star that adds or removes the perfume from the home page recommendations. */
export function FeaturedToggle({ id, featured }: { id: number; featured: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className={featured ? "star on" : "star"}
      aria-pressed={featured}
      aria-label={featured ? "הסרה מהמומלצים" : "הוספה למומלצים"}
      title={featured ? "מומלץ, לחיצה להסרה" : "לחיצה להוספה למומלצים"}
      disabled={pending}
      onClick={() => start(() => toggleFeatured(id))}
    >
      {featured ? "★" : "☆"}
    </button>
  );
}

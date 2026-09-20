import Link from "next/link";
import { getStoreProducts, latestIds } from "@/lib/catalog";
import { GENDERS, GENDER_LABELS, isGender } from "@/lib/gender";
import { isSortKey, SORT_KEYS, SORT_LABELS, sortProducts, type SortKey } from "@/lib/sort";
import { ProductCard } from "../ProductCard";
import { GlassSelect } from "./GlassSelect";

export const dynamic = "force-dynamic";

type State = { brand?: string; gender?: string; inStock?: boolean; latest?: boolean; sort?: SortKey };

export default async function Shop({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string; gender?: string; inStock?: string; new?: string; sort?: string }>;
}) {
  const q = await searchParams;
  const state: State = {
    brand: q.brand || undefined,
    gender: isGender(q.gender) ? q.gender : undefined,
    inStock: !!q.inStock,
    latest: !!q.new,
    sort: isSortKey(q.sort) ? q.sort : undefined,
  };

  const all = await getStoreProducts();
  const brands = [...new Set(all.map((p) => p.brand))].sort();
  const newest = latestIds(all);
  const filtered = all.filter(
    (p) =>
      (!state.brand || p.brand === state.brand) &&
      // a unisex perfume suits women and men too, so it also shows under those two
      (!state.gender || p.gender === state.gender || (state.gender !== "unisex" && p.gender === "unisex")) &&
      (!state.inStock || p.stock !== "out") &&
      (!state.latest || newest.has(p.id)),
  );
  // Newest first unless another sort is chosen.
  const activeSort: SortKey = state.sort ?? "newest";
  const products = sortProducts(filtered, activeSort);

  /** A link to this page with some of the current choices changed. */
  const href = (change: Partial<State>) => {
    const next = { ...state, ...change };
    const params = new URLSearchParams();
    if (next.brand) params.set("brand", next.brand);
    if (next.gender) params.set("gender", next.gender);
    if (next.inStock) params.set("inStock", "1");
    if (next.latest) params.set("new", "1");
    if (next.sort) params.set("sort", next.sort);
    const qs = params.toString();
    return qs ? `/shop?${qs}` : "/shop";
  };

  return (
    <div className="container shop-wide">
      <h1 className="sr-only">חנות</h1>
      {/* Every part is a direct child of the layout grid, so the order can differ by screen:
          desktop = brands on the right, filters and sorting on top, products below;
          phone = filters, brands, sorting, products. */}
      <div className="shop-layout">

        <div className="shop-filters filters">
          <Link href={href({ gender: undefined })} className={!state.gender ? "active" : undefined}>כל הבשמים</Link>
          {GENDERS.map((g) => (
            <Link key={g} href={href({ gender: g })} className={state.gender === g ? "active" : undefined}>{GENDER_LABELS[g]}</Link>
          ))}
          <Link href={href({ inStock: !state.inStock })} className={state.inStock ? "active" : undefined} aria-pressed={state.inStock}>
            {state.inStock ? "✓ " : ""}הצג רק מוצרים במלאי
          </Link>
          <Link href={href({ latest: !state.latest })} className={state.latest ? "active" : undefined} aria-pressed={state.latest}>
            {state.latest ? "✓ " : ""}חדש באתר
          </Link>
        </div>

        <div className="brand-select">
          <GlassSelect
            placeholder="כל המותגים"
            currentKey={state.brand ?? ""}
            options={[
              { key: "", label: "כל המותגים", href: href({ brand: undefined }) },
              ...brands.map((b) => ({ key: b, label: b, href: href({ brand: b }) })),
            ]}
          />
        </div>

        <div className="shop-sort">
          <GlassSelect
            placeholder="מיון"
            currentKey={activeSort}
            options={SORT_KEYS.map((key) => ({
              key,
              label: SORT_LABELS[key],
              // the default (newest) needs no parameter; choosing the selected option again returns to it
              href: href({ sort: key === "newest" || state.sort === key ? undefined : key }),
            }))}
          />
        </div>

        {products.length === 0 ? (
          <p className="muted shop-products">אין כרגע בשמים להצגה.</p>
        ) : (
          <div className="grid shop-products">{products.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        )}
      </div>
    </div>
  );
}

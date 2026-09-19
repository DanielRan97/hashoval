/** Product photo on a plain background, or a quiet monogram when there is no photo yet. */
export function ProductImage({ url, brand, name }: { url: string | null; brand: string; name: string }) {
  return (
    <div className="img-frame">
      {url ? <img src={url} alt={`${brand} ${name}`} /> : <span className="monogram" aria-hidden="true">{brand.charAt(0)}</span>}
    </div>
  );
}

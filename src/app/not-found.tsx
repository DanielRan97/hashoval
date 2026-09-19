import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container prose message-page">
      <h1>הדף לא נמצא</h1>
      <p>אולי הכתובת שונתה, או שהבושם כבר לא זמין.</p>
      <Link href="/shop" className="btn">לחנות</Link>
    </div>
  );
}

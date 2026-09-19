/** Tells the customer which items were dropped from the cart because they can no longer be bought. */
export function RemovedNotice({ removed }: { removed: (string | null)[] }) {
  if (removed.length === 0) return null;
  const names = removed.filter((n): n is string => !!n);
  return (
    <p className="notice" role="status">
      {names.length > 0
        ? `הוסרו מהסל בגלל שאזל המלאי או שאינם זמינים: ${names.join(", ")}.`
        : "חלק מהפריטים הוסרו מהסל כי אינם זמינים יותר."}
    </p>
  );
}

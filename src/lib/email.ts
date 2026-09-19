/**
 * Transactional email. Uses Resend when RESEND_API_KEY and EMAIL_FROM are set;
 * otherwise the message is only logged, so the order flow works before a provider exists.
 */
export async function sendEmail(to: string, subject: string, text: string): Promise<{ sent: boolean }> {
  // Trim: a stray space in .env would otherwise make the address invalid.
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!key || !from) {
    console.log(`[email not configured] to=${to} subject=${subject}\n${text}`);
    return { sent: false };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, text }),
    });
    if (!res.ok) console.error("email failed", res.status, await res.text());
    return { sent: res.ok };
  } catch (e) {
    console.error("email failed", e);
    return { sent: false };
  }
}

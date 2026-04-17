/**
 * Normalize a user-entered phone into strict E.164.
 *
 * Accepts the formats Guyanais users commonly type :
 *  - `0694 12 34 56`            → `+594694123456`  (french domestic form)
 *  - `0033 6 94 12 34 56`       → `+33694123456`
 *  - `+594 694 12 34 56`        → `+594694123456`
 *  - `594 694 12 34 56`         → `+594694123456`  (missing +)
 *  - `06 94 12 34 56`           → `+594694123456`  (leading-0 local)
 *  - `+1 (415) 555-0123`        → `+14155550123`
 *
 * Returns null if the input is empty, too short, too long, or contains
 * characters that are not digits / plus / whitespace / common separators.
 *
 * We do not run a full carrier lookup — only shape validation. The actual
 * deliverability is checked by Supabase+Twilio when the OTP is sent.
 */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Reject anything exotic — keep only digits, +, and common separators.
  if (!/^[+\d\s().\-]+$/.test(trimmed)) return null;

  // Strip separators, keep only digits and a single leading +.
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^\d]/g, "");
  if (digits.length < 8 || digits.length > 15) return null;

  // Already E.164-ish : `+CCxxxxxxxxx`
  if (hasPlus) {
    return `+${digits}`;
  }

  // `00CCxxxxxxxxx` → international dial prefix → replace `00` with `+`
  if (digits.startsWith("00")) {
    const rest = digits.slice(2);
    if (rest.length < 6 || rest.length > 15) return null;
    return `+${rest}`;
  }

  // Leading 0 + 9 digits → french domestic mobile (0694...).
  // Guyane uses +594, Métropole uses +33. We assume Guyane as default for 069x
  // (693/694/695 are Guyane mobile prefixes). Fall back to +33 otherwise.
  if (digits.startsWith("0") && digits.length === 10) {
    const rest = digits.slice(1);
    const isGuyaneMobile = /^69[3-5]/.test(rest);
    return isGuyaneMobile ? `+594${rest}` : `+33${rest}`;
  }

  // Otherwise assume the user typed the country code without the plus.
  return `+${digits}`;
}

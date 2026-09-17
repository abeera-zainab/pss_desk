export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$|^[a-z0-9]{3,32}$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isEmailIdentifier(raw: string): boolean {
  return raw.includes("@");
}

export function looksLikeLoginNo(raw: string): boolean {
  const t = raw.trim().replace(/\s+/g, "");
  return /^(pss-)?\d+$/i.test(t);
}

export function normalizeLoginNo(raw: string): string {
  const digits = raw.trim().replace(/\s+/g, "").replace(/^pss-/i, "").replace(/\D/g, "");
  if (!digits) return "";
  return `PSS-${digits.padStart(4, "0")}`;
}

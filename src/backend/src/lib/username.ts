export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$|^[a-z0-9]{3,32}$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isEmailIdentifier(raw: string): boolean {
  return raw.includes("@");
}

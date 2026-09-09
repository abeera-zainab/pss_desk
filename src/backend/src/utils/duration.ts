// Parse a short duration string like "15m", "7d", "8h", "30s" into milliseconds.
// Used to compute refresh-token expiry dates from env config.
export function durationToMs(input: string): number {
  const match = /^(\d+)\s*(ms|s|m|h|d)$/.exec(input.trim());
  if (!match) throw new Error(`Invalid duration: "${input}"`);
  const value = Number(match[1]);
  const unit = match[2];
  const table: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000
  };
  return value * table[unit];
}

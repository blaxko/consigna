// All USDC amounts in this app are 6-decimal ERC-20 units (bigint). Never use the 18-decimal native balance for math.
export const USDC_DECIMALS = 6;
const UNIT = 10n ** BigInt(USDC_DECIMALS);

/** Parses a decimal USDC string such as "5.00" into 6-decimal units (5000000n). Throws on anything else. */
export function parseUsdc(input: string): bigint {
  const s = input.trim();
  if (!/^\d+(\.\d+)?$/.test(s)) throw new Error(`Invalid USDC amount: "${input}"`);
  const [whole, frac = ""] = s.split(".");
  if (frac.length > USDC_DECIMALS) throw new Error(`USDC supports up to 6 decimal places: "${input}"`);
  const units = BigInt(whole) * UNIT + BigInt(frac.padEnd(USDC_DECIMALS, "0"));
  if (units <= 0n) throw new Error("Amount must be greater than 0");
  return units;
}

/** Formats 6-decimal units as "5.00". Shows at least 2 decimals, and more only when the value needs them. */
export function formatUsdc(units: bigint): string {
  const negative = units < 0n;
  const abs = negative ? -units : units;
  const whole = abs / UNIT;
  const frac = (abs % UNIT).toString().padStart(USDC_DECIMALS, "0");
  let trimmed = frac.replace(/0+$/, "");
  if (trimmed.length < 2) trimmed = frac.slice(0, 2);
  return `${negative ? "-" : ""}${whole.toString()}.${trimmed}`;
}

/** "0x7416…c728": the 0x prefix plus the first and last 4 hex characters. */
export function shortAddress(address: string, head = 4, tail = 4): string {
  if (address.length <= 2 + head + tail) return address;
  return `${address.slice(0, 2 + head)}…${address.slice(-tail)}`;
}

/** Unix seconds to the PRD CSV form, YYYY-MM-DDTHH:MM:SSZ (UTC). */
export function formatUtc(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
}

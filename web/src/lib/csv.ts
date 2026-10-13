// PRD §7.4 CSV: UTF-8, RFC 4180, CRLF records. NFR-S6: formula injection is neutralised by
// prefixing a cell that starts with = + - @ tab or CR with an apostrophe.

export const CSV_COLUMNS = [
  "date_utc",
  "ref",
  "status",
  "amount",
  "token",
  "payer",
  "issuer",
  "invoice_id",
  "tx_hash",
  "explorer_url",
] as const;

export const CSV_HEADER = CSV_COLUMNS.join(",");

export type CsvRow = Record<(typeof CSV_COLUMNS)[number], string>;

const FORMULA_TRIGGERS = ["=", "+", "-", "@", "\t", "\r"];

/** Escapes one cell: formula-trigger prefix first, then RFC 4180 quoting when needed. */
export function escapeCell(value: string): string {
  let v = value;
  if (v.length > 0 && FORMULA_TRIGGERS.includes(v[0])) v = `'${v}`;
  if (/[",\r\n]/.test(v)) v = `"${v.replace(/"/g, '""')}"`;
  return v;
}

/** Builds the full CSV text: header, then one CRLF-terminated record per row. */
export function toCsv(rows: CsvRow[]): string {
  const lines = [CSV_HEADER, ...rows.map((r) => CSV_COLUMNS.map((c) => escapeCell(r[c])).join(","))];
  return lines.map((l) => `${l}\r\n`).join("");
}

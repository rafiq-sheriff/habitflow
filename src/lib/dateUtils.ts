/** @returns YYYY-MM-DD in local calendar interpretation via ISO split (matches original) */
export function today(): string {
  return new Date().toISOString().split("T")[0]!;
}

export function fmtDate(d: string, opts: Intl.DateTimeFormatOptions): string {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", opts);
}

export function fmtTime(t: string): string {
  const [h, m] = t.split(":");
  const H = Number(h);
  return `${H > 12 ? H - 12 : H || 12}:${m} ${H >= 12 ? "PM" : "AM"}`;
}

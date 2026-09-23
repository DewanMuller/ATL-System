export function parseOptionalFloat(value: FormDataEntryValue | null) {
  if (value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function parseOptionalDate(value: FormDataEntryValue | null) {
  if (value === null || value === "") return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

// The inverse of parseOptionalDate: formats a Date as the "YYYY-MM-DD"
// string an <input type="date"> defaultValue/display expects.
export function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
}

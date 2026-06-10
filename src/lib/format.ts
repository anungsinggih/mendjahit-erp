type DateInput = string | Date | null | undefined;
type NumericInput = number | string | null | undefined;

export function toNumber(value: NumericInput): number {
  if (typeof value === "number") {
    return Number.isNaN(value) ? 0 : value;
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) return 0;

    const parsed = Number(normalized);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

export function formatCurrency(amount: NumericInput): string {
  const safeAmount = toNumber(amount);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(safeAmount);
}

export function formatDate(dateInput: DateInput, locale = "id-ID"): string {
  if (!dateInput) return "-";
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return String(dateInput);
  return d.toLocaleDateString(locale);
}

export function safeDocNo(
  docNo?: string | null,
  fallbackId?: string | null,
  withLabel = false,
): string {
  const trimmed = docNo?.trim();
  if (trimmed) return trimmed;
  if (!fallbackId) return "-";
  const shortId = fallbackId.substring(0, 8);
  return withLabel ? `Doc No: ${shortId}` : shortId;
}

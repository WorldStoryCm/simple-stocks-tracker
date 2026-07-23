import { formatAmount, formatPrice } from "@/lib/currency";

export function formatQuantity(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 8 });
}

export function formatSignedAmount(value: number, currencyCode: string) {
  if (Math.abs(value) < 0.005) return formatAmount(0, currencyCode);
  return `${value > 0 ? "+" : "-"}${formatAmount(Math.abs(value), currencyCode)}`;
}

export function pnlClass(value: number) {
  if (value > 0.004) return "text-[color:var(--positive)]";
  if (value < -0.004) return "text-[color:var(--negative)]";
  return "text-text-secondary";
}

export function formatSessionPrice(value: number, currencyCode: string) {
  return formatPrice(value, currencyCode);
}

export function localDateTimeValue(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function toIso(localValue: string) {
  return new Date(localValue).toISOString();
}

export function formatSessionTime(value: Date | string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

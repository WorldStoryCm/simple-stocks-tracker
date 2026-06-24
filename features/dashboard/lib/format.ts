export function fmtMoney(value: number, withSign = true) {
  const sign = withSign ? (value > 0 ? "+" : value < 0 ? "-" : "") : "";
  const abs = Math.abs(value);
  return `${sign}$${abs.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function fmtPct(value: number) {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}

type ParsedExecution = {
  date?: string;
  executedAt?: string;
};

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function parseExecution(value: string | undefined): ParsedExecution {
  const text = value?.trim();
  if (!text) return {};

  const iso = text.match(
    /^(\d{4}-\d{2}-\d{2})(?:[T ,;]+(\d{1,2}):(\d{2})(?::(\d{2})(\.\d+)?)?\s*(Z|[+-]\d{2}:?\d{2})?)?$/,
  );
  if (iso && validDate(iso[1])) {
    if (!iso[2]) return { date: iso[1] };
    const zone = iso[6]?.replace(/^([+-]\d{2})(\d{2})$/, "$1:$2") ?? "";
    const time = `${iso[2].padStart(2, "0")}:${iso[3]}:${iso[4] ?? "00"}${iso[5] ?? ""}`;
    return { date: iso[1], executedAt: `${iso[1]}T${time}${zone}` };
  }

  const compact = text.match(/^(\d{4})(\d{2})(\d{2})[;,\s]+(\d{2})(\d{2})(\d{2})$/);
  if (compact) {
    const date = `${compact[1]}-${compact[2]}-${compact[3]}`;
    return { date, executedAt: `${date}T${compact[4]}:${compact[5]}:${compact[6]}` };
  }

  const datePrefix = text.slice(0, 10);
  return validDate(datePrefix) ? { date: datePrefix } : {};
}

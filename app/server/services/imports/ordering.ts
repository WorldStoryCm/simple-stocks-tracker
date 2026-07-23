type ImportOrderRow = {
  date?: string;
  executedAt?: string;
  executionOrder?: number;
  rowIndex: number;
};

function compareText(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function compareImportRows(left: ImportOrderRow, right: ImportOrderRow) {
  const dateCompare = compareText(left.date ?? "", right.date ?? "");
  if (dateCompare) return dateCompare;

  if (left.executedAt || right.executedAt) {
    const fallback = `${left.date ?? ""}T00:00:00`;
    const executionCompare = compareText(left.executedAt ?? fallback, right.executedAt ?? fallback);
    if (executionCompare) return executionCompare;
  }

  if (left.executionOrder != null && right.executionOrder != null) {
    const orderCompare = left.executionOrder - right.executionOrder;
    if (orderCompare) return orderCompare;
  }

  return left.rowIndex - right.rowIndex;
}

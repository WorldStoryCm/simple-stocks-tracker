import { fmtMoney } from "./format";

export function buildGoalRowState(current: number, target: number) {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;

  return {
    currentLabel: fmtMoney(current, current < 0),
    fillPercentage: Math.min(Math.max(percentage, 0), 100),
    isNegative: current < 0,
    percentage,
    remaining: Math.max(target - current, 0),
  };
}

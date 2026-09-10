import type { RecoveryContract } from './major-campaign';
export type ContractStats = {
  seconds: number;
  pristine?: number;
  economicFinds?: number;
  lowestCondition?: number;
  thermalSeconds?: number;
  initialSolid?: number;
  remainingSolid?: number;
};
export function contractInstruction(contract: RecoveryContract) {
  const goal = contract.objective;
  const instruction =
    goal.kind === 'pristine'
      ? `Recover ${goal.count} pristine finds`
      : goal.kind === 'bulk'
        ? 'Clear at least 80% of the ice'
        : goal.kind === 'rush'
          ? `Finish within ${goal.seconds}s of work`
          : goal.kind === 'precision'
            ? 'Keep every find Clean or better'
            : 'Finish without thermal heat';
  return `${instruction} · +$${goal.bonus.toLocaleString('en-US')} optional bonus`;
}
export function evaluateContract(
  contract: RecoveryContract,
  stats: ContractStats,
) {
  const g = contract.objective;
  const measured = (n: unknown): n is number =>
    typeof n === 'number' && Number.isFinite(n) && n >= 0;
  const count = (n: unknown): n is number => measured(n) && Number.isInteger(n);
  // Missing legacy measurements are unknown, not proof that an objective was
  // met. Optional bonus rejection never changes the underlying cargo payout.
  const eligible =
    Number.isSafeInteger(g.bonus) &&
    g.bonus >= 0 &&
    (g.kind === 'pristine'
      ? count(stats.pristine) &&
        count(g.count) &&
        g.count > 0 &&
        stats.pristine >= g.count
      : g.kind === 'bulk'
        ? count(stats.initialSolid) &&
          stats.initialSolid > 0 &&
          count(stats.remainingSolid) &&
          stats.remainingSolid <= stats.initialSolid * 0.2
        : g.kind === 'rush'
          ? measured(stats.seconds) &&
            measured(g.seconds) &&
            g.seconds > 0 &&
            stats.seconds <= g.seconds
          : g.kind === 'precision'
            ? count(stats.economicFinds) &&
              stats.economicFinds > 0 &&
              measured(stats.lowestCondition) &&
              stats.lowestCondition <= 100 &&
              stats.lowestCondition >= 75
            : g.kind === 'noThermal' &&
              measured(stats.thermalSeconds) &&
              stats.thermalSeconds === 0);
  return { eligible, bonus: eligible ? g.bonus : 0 };
}

import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const output = args.find((arg) => arg.startsWith('--out='))?.slice(6);
const files = args.filter((arg) => !arg.startsWith('--'));
if (!output || !files.length)
  throw Error('Pass --out=path and full simulation JSON paths');
const runs = files.map((file) => ({
  file,
  ...JSON.parse(readFileSync(file, 'utf8')),
}));
const mixed = runs.find((r) => r.policy === 'mixed');
if (!mixed) throw Error('The cohort must include Mixed');
const round = (n) => Math.round(n * 100) / 100;
const jaccard = (a, b) => {
  const sa = new Set(a),
    sb = new Set(b);
  return (
    [...sa].filter((id) => sb.has(id)).length / new Set([...sa, ...sb]).size
  );
};
const rows = runs.map((r) => ({
  policy: r.policy,
  file: r.file,
  completed: r.completed,
  activeMinutes: r.campaignActiveMinutes,
  experienceMinutes: r.estimatedExperienceMinutes,
  valueWeightedBonusPercent: r.valueWeightedBonusPercent,
  meanItemBonusPercent: r.meanItemBonusPercent,
  averageCondition: r.averageCondition,
  pristine: r.pristine,
  nodeCount: r.nodeCount,
  midgameJaccardVsMixed: round(jaccard(r.midgame.nodes, mixed.midgame.nodes)),
  endgameJaccardVsMixed: round(jaccard(r.nodes, mixed.nodes)),
  gross: r.gross,
  net: r.net,
  commission: r.commission,
  money: r.money,
  maxNoAffordableOpportunitySeconds: r.maxNoAffordableOpportunitySeconds,
  vaultActiveSeconds: round(
    r.phases
      .filter((p) => p.block === 32)
      .reduce((sum, p) => sum + p.activeSeconds, 0),
  ),
  vaultPhaseActiveSeconds: r.phases
    .filter((p) => p.block === 32)
    .map((p) => p.activeSeconds),
  toolModeUsageSeconds: r.toolModeUsageSeconds,
  aimStats: r.aimStats,
  financialIntegrity: r.financialIntegrity,
  source: r.source,
}));
const range = (key, selected = rows) => {
  const sorted = [...selected].sort((a, b) => a[key] - b[key]);
  return {
    fastest: sorted[0].policy,
    slowest: sorted.at(-1).policy,
    min: sorted[0][key],
    max: sorted.at(-1)[key],
    spreadPercentOfFastest: round(
      (sorted.at(-1)[key] / sorted[0][key] - 1) * 100,
    ),
  };
};
const report = {
  note: 'Measured engine active time; first-time experience includes the explicit per-run overhead model. Spread is (slowest / fastest - 1) × 100. Inefficient is an intentional second-best-tool diagnostic and is separately excluded from sensible-policy spread. This report makes no GPU claims.',
  sameFrozenSource: runs.every(
    (r) => JSON.stringify(r.source) === JSON.stringify(mixed.source),
  ),
  allCompleted: runs.every((r) => r.completed),
  allFinancialIntegrity: runs.every((r) =>
    Object.values(r.financialIntegrity).every(Boolean),
  ),
  activeRange: range('activeMinutes'),
  sensibleActiveRange: range(
    'activeMinutes',
    rows.filter((r) => r.policy !== 'inefficient'),
  ),
  experienceRange: range('experienceMinutes'),
  sensibleExperienceRange: range(
    'experienceMinutes',
    rows.filter((r) => r.policy !== 'inefficient'),
  ),
  rows,
};
writeFileSync(output, JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    {
      ...report,
      rows: rows.map(
        ({
          source: _source,
          financialIntegrity: _financialIntegrity,
          toolModeUsageSeconds: _toolModeUsageSeconds,
          aimStats: _aimStats,
          ...r
        }) => r,
      ),
    },
    null,
    2,
  ),
);

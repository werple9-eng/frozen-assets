import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const {
  ALL_TOOL_NODES,
} = require('../qa-artifacts/major-sim-build/lib/game/tool-trees.js');
const nodes = new Map(ALL_TOOL_NODES.map((n) => [n.id, n]));
const files = process.argv.slice(2);
if (!files.length) throw Error('Pass one or more full simulation JSON paths');
const round = (n) => Math.round(n * 100) / 100;
const percentile = (xs, p) =>
  xs.length
    ? [...xs].sort((a, b) => a - b)[Math.floor((xs.length - 1) * p)]
    : null;
const reports = files.map((file) => {
  const r = JSON.parse(readFileSync(file, 'utf8'));
  const end = Object.values(r.toolUsageSeconds).reduce(
    (sum, seconds) => sum + seconds,
    0,
  );
  const points = [
    { at: 0, time: 0, tool: 'hand' },
    ...Object.values(r.toolBuys).map((p) => ({
      at: p.activeSeconds,
      time: p.time,
      tool: p.id,
    })),
    ...r.switches.map((p) => ({
      at: p.activeSeconds,
      time: p.time,
      tool: p.to,
    })),
    { at: end, time: Infinity, tool: null },
  ].sort((a, b) => a.at - b.at || a.time - b.time);
  const segments = points
    .slice(0, -1)
    .map((p, i) => ({ from: p.at, to: points[i + 1].at, tool: p.tool }));
  const useAfter = (tool, at, horizon) =>
    segments
      .filter((s) => s.tool === tool)
      .reduce(
        (sum, s) =>
          sum +
          Math.max(0, Math.min(s.to, at + horizon) - Math.max(s.from, at)),
        0,
      );
  const purchases = r.purchases
    .filter((p) => p.kind === 'node' && !p.tutorial)
    .map((p) => {
      const node = nodes.get(p.id),
        delivery = r.deliveries.find((d) => d.block === p.block);
      return {
        ...p,
        tool: node.toolId,
        next90ActiveSecondsToolUse: round(
          useAfter(node.toolId, p.activeSeconds, 90),
        ),
        remainingCampaignToolUse: round(
          useAfter(node.toolId, p.activeSeconds, Infinity),
        ),
        currentDeliveryFractionOfNet:
          delivery?.net > 0 ? round(p.cost / delivery.net) : null,
      };
    });
  const allPurchases = r.purchases.filter((p) => !p.tutorial);
  const micro = allPurchases.filter((p) => p.kind === 'node' && !p.major);
  const milestones = allPurchases.filter((p) => p.kind === 'tool' || p.major);
  const gaps = (list) =>
    list.slice(1).map((p, i) => round(p.activeSeconds - list[i].activeSeconds));
  return {
    policy: r.policy,
    file,
    nodeCount: r.nodeCount,
    note: 'Tool use is integrated from the actual active-clock tool purchase/switch trace. Zero use proves no direct tool-work benefit in that window; nonzero use does not prove a speed gain. No counterfactual speed-up is invented.',
    microPurchaseGapSeconds: {
      median: percentile(gaps(micro), 0.5),
      p90: percentile(gaps(micro), 0.9),
      max: Math.max(0, ...gaps(micro)),
    },
    milestoneGapSeconds: {
      median: percentile(gaps(milestones), 0.5),
      p90: percentile(gaps(milestones), 0.9),
      max: Math.max(0, ...gaps(milestones)),
    },
    maxNoAffordableOpportunitySeconds: r.maxNoAffordableOpportunitySeconds,
    zeroToolUseNext90Seconds: purchases.filter(
      (p) => p.next90ActiveSecondsToolUse < 0.05,
    ),
    zeroToolUseForRestOfCampaign: purchases.filter(
      (p) => p.remainingCampaignToolUse < 0.05,
    ),
    purchases,
  };
});
writeFileSync(
  'qa-artifacts/major-purchase-use-audit.json',
  JSON.stringify(reports, null, 2),
);
console.log(
  JSON.stringify(
    reports.map(({ purchases: _purchases, ...r }) => r),
    null,
    2,
  ),
);

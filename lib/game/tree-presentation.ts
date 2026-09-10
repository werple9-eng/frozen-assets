import { MAP, TOOL_TREES, nodeState, type MajorTool } from './tool-trees';

export const TREE_GROWTH = {
  pathDelay: 70,
  pathDuration: 260,
  revealAt: 350,
  settleAt: 1100,
};
export function growthPlan(tool: MajorTool, id: string, owned: string[]) {
  const before = owned.filter((n) => n !== id),
    after = [...before, id];
  return TOOL_TREES[tool]
    .filter((n) => n.id !== id && nodeState(n, before) !== nodeState(n, after))
    .map((n) => ({
      id: n.id,
      from: nodeState(n, before),
      to: nodeState(n, after),
      child: n.parentIds.includes(id),
    }));
}

// Direction chooses an adjacent graph edge, never a distant unrelated node.
export function connectedNode(
  tool: MajorTool,
  id: string,
  dx: number,
  dy: number,
) {
  const list = TOOL_TREES[tool],
    root = {
      id: 'root',
      x: MAP.rootX,
      y: MAP.rootY,
      parentIds: [] as string[],
    };
  const current = id === 'root' ? root : list.find((n) => n.id === id);
  if (!current) return null;
  const parents = current.parentIds.length ? current.parentIds : ['root'];
  return (
    [root, ...list]
      .filter(
        (n) =>
          n.id !== id &&
          (id === 'root'
            ? !n.parentIds.length
            : parents.includes(n.id) || n.parentIds.includes(id)),
      )
      .filter((n) => (n.x - current.x) * dx + (n.y - current.y) * dy > 1)
      .sort((a, b) => {
        const score = (n: { x: number; y: number }) => {
          const x = n.x - current.x,
            y = n.y - current.y;
          return (
            Math.hypot(x, y) *
            (1 + Math.abs(x * dy - y * dx) / Math.max(1, x * dx + y * dy))
          );
        };
        return score(a) - score(b);
      })[0]?.id ?? null
  );
}

type Point = { x: number; y: number };
export function tooltipPosition(
  selected: Point,
  neighbors: Point[],
  panel: { w: number; h: number },
  viewport: { w: number; h: number },
  radius: number,
) {
  const { x, y } = selected,
    { w, h } = panel,
    gap = radius + 16;
  const minX = 16,
    maxX = Math.max(16, viewport.w - w - 54),
    minY = Math.min(144, viewport.h * 0.2),
    maxY = Math.max(minY, viewport.h - h - 90);
  const choices = [
    { x: x + gap, y: y - h / 2 },
    { x: x - w - gap, y: y - h / 2 },
    { x: x - w / 2, y: y - h - gap },
    { x: x - w / 2, y: y + gap },
  ].map((p) => ({
    x: Math.max(minX, Math.min(maxX, p.x)),
    y: Math.max(minY, Math.min(maxY, p.y)),
  }));
  const distance = (p: Point, q: Point) =>
    Math.hypot(
      Math.max(p.x - q.x, 0, q.x - p.x - w),
      Math.max(p.y - q.y, 0, q.y - p.y - h),
    );
  return choices.sort((a, b) => {
    const score = (p: Point) =>
      (distance(p, selected) < radius + 4 ? 100000 : 0) +
      neighbors.reduce((s, n) => s + (distance(p, n) < radius ? 1000 : 0), 0) +
      Math.hypot(p.x + w / 2 - x, p.y + h / 2 - y);
    return score(a) - score(b);
  })[0];
}

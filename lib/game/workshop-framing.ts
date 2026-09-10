export type ProjectedBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

// Compose the entire working cluster. The camera remains fixed in space and
// props remain fixed on the desk: zoom only changes the orthographic crop.
export function workshopFrame(
  ice: ProjectedBounds,
  props: ProjectedBounds,
  aspect: number,
  zoom: number,
) {
  aspect = Math.max(0.25, aspect);
  const minX = Math.min(ice.minX, props.minX),
    maxX = Math.max(ice.maxX, props.maxX);
  const minY = Math.min(ice.minY, props.minY),
    maxY = Math.max(ice.maxY, props.maxY);
  const x = (minX + maxX) / 2;
  const minSpan = Math.max(
    (maxX - minX) / (2 * aspect * 0.85),
    (maxY - minY) / (2 * 0.7),
  );
  const y = (minY + maxY) / 2 + minSpan * 0.035;
  const base = Math.max(
    minSpan * 1.12,
    (ice.maxX - ice.minX) / (2 * aspect * 0.6),
    (ice.maxY - ice.minY) / 1.12,
  );
  const span = Math.max(
    minSpan,
    base / 2 ** ((Math.max(0, Math.min(1, zoom)) - 0.5) * 0.75),
  );
  return { x, y, span, minSpan, minX, maxX, minY, maxY };
}

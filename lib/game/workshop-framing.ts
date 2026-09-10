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
  const z = Math.max(0, Math.min(1, zoom));
  const focus = Math.min(1, z / 0.45);
  const x =
    ((minX + maxX) / 2) * (1 - focus) + ((ice.minX + ice.maxX) / 2) * focus;
  const minSpan = Math.max(
    (maxX - minX) / (2 * aspect * 0.85),
    (maxY - minY) / (2 * 0.7),
  );
  const y =
    ((minY + maxY) / 2 + minSpan * 0.035) * (1 - focus) +
    ((ice.minY + ice.maxY) / 2) * focus;
  const close = Math.max(
    (ice.maxX - ice.minX) / (2 * aspect * 0.82),
    (ice.maxY - ice.minY) / 1.48,
  );
  // Wide establishes the workshop; the middle frames the ice. Beyond that,
  // freely inspect a small part of the block instead of clamping to desk props.
  const span =
    z <= 0.5
      ? minSpan * 1.12 * (close / (minSpan * 1.12)) ** (z * 2)
      : close / 2 ** ((z - 0.5) * 5.5);
  return { x, y, span, minSpan, minX, maxX, minY, maxY };
}

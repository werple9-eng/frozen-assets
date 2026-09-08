import type { Upgrade } from '@/lib/game/model';
export function FittingDrawing({
  kind,
  level = 1,
}: {
  kind: Upgrade | 'torch';
  level?: number;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className="fitting-drawing"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="square"
      strokeLinejoin="miter"
    >
      {kind === 'heat' ? (
        <>
          <path d="M13 26h31v12H13zM7 23v18M44 29h9v6h-9M20 21v22M28 26v12M36 26v12" />
          <path
            d={`M54 ${28 - level}l6 -${level + 1}M55 32h7M54 ${36 + level}l6 ${level + 1}`}
          />
        </>
      ) : kind === 'tank' ? (
        <>
          <path d="M21 18h22v34H21zM25 18v-6h14v6M29 12V7h6M21 24h22M21 45h22M27 28v10" />
          <path d="M35 30h4M35 35h4" />
        </>
      ) : kind === 'wide' ? (
        <>
          <path d="M9 25h18l17-10v34L27 39H9zM27 25v14M17 25v14M49 21l9-6M49 32h12M49 43l9 6" />
        </>
      ) : kind === 'residual' ? (
        <>
          <path d="M11 26h42v13H11zM18 19v27M25 17v31M32 15v35M39 17v31M46 19v27M7 30v5M57 30v5" />
        </>
      ) : (
        <>
          <path d="M9 25h34v13H9zM43 29h13v5H43M19 38l-3 17h13l5-17M16 20h17M21 16v4M12 28v7M24 25v13M35 25v13" />
        </>
      )}
    </svg>
  );
}

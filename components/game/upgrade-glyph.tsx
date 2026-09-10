import type { ToolNode } from '@/lib/game/tool-trees';

// Drawn on a 40-unit engraving grid. Solid working parts carry the silhouette;
// the thinner marks explain the action. No category badge or miniature text.
// Moving parts have their own pivot, independent of the node's purchase spring.
type Engraving = {
  body: string;
  cut?: string;
  action?: string;
  ground?: string;
  motion?: 'strike' | 'swing' | 'rebound' | 'spin' | 'peel' | 'heat' | 'pulse';
};
export const UPGRADE_ENGRAVINGS: Record<string, Engraving> = {
  // Chisel: small steel edge, fine shavings, delicate finds.
  'HC-P1': {
    body: 'M18 5h7v18l-4 7-3-7Z',
    cut: 'M21 8v13',
    action: 'M10 21l-4-4m24 4 4-4M13 31l-4 4m20-4 4 4',
    ground: 'M12 34h6l3-4 3 4h5',
    motion: 'strike',
  },
  'HC-P2': {
    body: 'm12 7 8-3 10 23-6 7-6-3Z',
    cut: 'm18 10 8 17-3 3M18 31l10-5',
    action: 'm7 10 2-5m22 9 5-2',
    motion: 'strike',
  },
  'HC-S1': {
    body: 'M18 5h6v17l-3 6-3-6Z',
    cut: 'M21 8v11',
    action: 'M10 12a13 13 0 1 0 23 12M10 6v7h7M31 17l2 7 5-4',
    ground: 'M14 31h4l3-3 3 3h4',
    motion: 'strike',
  },
  'HC-S2': {
    body: 'm22 6 6 2-6 19-6 4 1-8Z',
    cut: 'm24 10-5 15',
    action: 'M8 11h9M5 18h9M8 25h4M27 27l6-9m-1 8 1-8-7 2',
    motion: 'rebound',
  },
  'HC-C1': {
    body: 'M17 4h8l-2 16-2 8-2-8Z',
    cut: 'M21 7v12',
    ground: 'M14 23a10 7 0 1 0 14 0M11 30h5m10 0h5M21 32v4',
    motion: 'strike',
  },
  'HC-C2': {
    body: 'm24 6 6 2-7 18-7 4 1-8Z',
    cut: 'm25 11-6 14',
    action: 'M15 29C6 28 5 20 9 16m-1 1 5-3 1 6',
    ground: 'M6 32h12l6-5 11 3M29 19a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
    motion: 'peel',
  },
  'HC-T1': {
    body: 'M17 10a6 6 0 1 0 0 12 6 6 0 0 0 0-12Zm-1 2h2v8h-2Z',
    ground: 'm4 27 7-4 3 6h7l3-6 11 6M10 34h19',
    action: 'M17 25v5m0-26v3M7 17H3m32 0h-7',
    motion: 'peel',
  },
  'HC-T2': {
    body: 'm21 11 10 3 3 8-9 3-7-6Z',
    cut: 'm22 15 7 2 2 4',
    action: 'M5 31c8 0 11-7 12-14m-5 4 5-4 2 6',
    ground: 'm6 34 11-4 6 4h10',
    motion: 'peel',
  },
  // Ice pick: slender hooked head and fast local work.
  'IP-P1': {
    body: 'M8 10c9-7 18-5 27 3l-13-3-7 22-5-2 7-21Z',
    cut: 'm15 25-2 4',
    ground: 'm6 35 8-3 6 3 5-5 9 5',
    motion: 'swing',
  },
  'IP-P2': {
    body: 'm7 9 9-4 14 5 4 10-9-7-8-1-7 22-5-2 7-21Z',
    cut: 'm16 8 12 4 3 4',
    action: 'm29 26 3-3m-1 8 5-1',
    motion: 'swing',
  },
  'IP-P3': {
    body: 'm11 7 8-3 13 6-10-1-7 20-4-2 6-19Z',
    ground: 'm4 30 9 3 5-6 3 10m3-9 9-2 3 8-10 3Z',
    action: 'M4 10v3m3-6v3m27 7v3m3-6v3',
    motion: 'strike',
  },
  'IP-S1': {
    body: 'm17 8 8-3 11 7-11-2-8 23-5-2 8-22Z',
    action: 'M6 10h7M3 17h10M5 24h6',
    motion: 'swing',
  },
  'IP-S2': {
    body: 'M7 10c8-6 17-6 27 3l-14-3-8 23-5-2 9-22Z',
    cut: 'm11 20 5 2m-6 2 5 2m-6 2 5 2',
    ground: 'm21 28 5-7 5 7Zm0 3h10',
    motion: 'rebound',
  },
  'IP-S3': {
    body: 'm20 7 7-2 10 6-10-1-7 21-4-2 7-20Z',
    action: 'M4 26v-5m5 8V16m5 9V10',
    ground: 'M4 35h4m4 0h4m4 0h4m4 0h4',
    motion: 'swing',
  },
  'IP-C1': {
    body: 'm9 7 11-2 14 9-14-4-8 18-4-2 8-18Z',
    ground: 'M15 28a8 6 0 1 0 16 0M23 24v5m0 4v4m-11-6h5m12 0h6',
    motion: 'strike',
  },
  'IP-C2': {
    body: 'm6 9 9-4 12 6-13-1-6 18-4-1 8-18Z',
    ground: 'M23 19a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm-3 5 3-2 3 2v5h-6Z',
    action: 'M13 18c-3 10 1 18 12 19m3-22 6 5m1 4v6',
    motion: 'peel',
  },
  'IP-T1': {
    body: 'm7 5 8-2 14 7-13-2-6 15-4-2 6-14Z',
    ground: 'm20 14-5 10 8 3-4 10m-4-13-8 5m16-2 10-8',
    action: 'm26 12 3 4 5-1',
    motion: 'strike',
  },
  'IP-T2': {
    body: 'm7 6 10-2 13 6 3 9-5-2-2-5-10-2-7 23-5-2 8-23Z',
    ground: 'm23 25 10-3 3 8-8 5-7-4Z',
    action: 'm21 20 3-6m-5 3 5-3 1 6',
    motion: 'peel',
  },
  // Heavy pick: thick cast heads, deep channels, structural supports.
  'HP-P1': {
    body: 'm6 8 12-4 17 7-2 8-11-6-7 21-6-2 7-22-10 3Z',
    cut: 'm20 8 10 5-1 3',
    motion: 'swing',
  },
  'HP-P2': {
    body: 'm8 6 11-3 14 7-2 7-10-5-6 22-5-2 7-23Z',
    ground: 'M5 19v17h9m10-17v17h11M24 24h5m-5 5h8',
    motion: 'strike',
  },
  'HP-P3': {
    body: 'm10 4 10-2 13 7-2 6-10-5-7 22-5-2 8-23Z',
    ground: 'M3 24h6m11 0h17M3 30h5m13 0h16m-22 3-2 5m8-5 4 4',
    action: 'm26 17 4-2m-1 5 5 1',
    motion: 'strike',
  },
  'HP-S1': {
    body: 'm7 8 11-3 17 7-2 6-12-5-7 21-6-2 7-22-8 3Z',
    cut: 'm16 17 4 2m-5 2 4 2',
    action: 'M4 18c-4 9 2 17 9 18m-5-5 5 5-7 1',
    motion: 'swing',
  },
  'HP-S2': {
    body: 'm18 5 9-1 10 7-3 6-9-6-7 24-7-3 9-24Z',
    cut: 'm15 23 5 2m-6 2 5 2m-6 2 5 2',
    action: 'M4 27c-2-9 2-14 8-16m-6 0h6v6',
    motion: 'rebound',
  },
  'HP-S3': {
    body: 'm16 4 10-1 12 8-3 6-10-6-7 22-6-2 9-24Z',
    action: 'M3 20V9h4m1 18V13h4',
    ground: 'm23 30 5-4 3 6 6 1m-10 2 1 4',
    motion: 'swing',
  },
  'HP-C1': {
    body: 'm5 11 7-8 13 2 7 8-13-4-4 5 14 17-5 4-16-22Z',
    ground: 'M35 14v22H12M31 20v8h-6',
    motion: 'strike',
  },
  'HP-C2': {
    body: 'm3 12 7-8 11 1 8 8-11-4-4 4 16 17-5 4-19-20Z',
    ground: 'M34 8v27M17 23l4-4m2 8 4-4m2 8 4-4',
    action: 'M7 31h10m-4-4 4 4-4 4',
    motion: 'strike',
  },
  'HP-T1': {
    body: 'm16 5 9-3 12 7-2 6-11-6-7 16-5-2 9-16Z',
    ground: 'M4 14h8v8l-4 3 4 4v7H4Zm15 18h16m-7-12v8m-3-4h6',
    motion: 'strike',
  },
  'HP-T2': {
    body: 'm7 5 10-2 12 6-2 6-9-5-7 18-5-2 8-20Z',
    ground: 'm3 34 10-4 6 5m6-16 9-3 3 6-7 4Zm-6 11 7-2 4 6-8 3Z',
    action: 'm22 15 4-4m8 18 3-2',
    motion: 'peel',
  },
  // Sledge: forged mass and deliberate wide arcs.
  'SH-P1': {
    body: 'm7 5 27 7-3 12-11-3-4 15-6-2 4-15-10-3Z',
    cut: 'm10 9 19 5-1 5-19-5Z',
    motion: 'swing',
  },
  'SH-P2': {
    body: 'm18 5 19 6-3 10-7-2-6 17-6-2 6-17-6-2Z',
    action: 'M4 29C-1 17 5 7 14 4M8 29l-4 1-1-5',
    motion: 'swing',
  },
  'SH-P3': {
    body: 'M5 4h24v11H5Zm9 11h6v14h-6Z',
    cut: 'M9 7h16',
    ground: 'm2 34 7-7 5 7m6-4 8-7 9 10-13 5Zm-9-2 1 4',
    motion: 'strike',
  },
  'SH-S1': {
    body: 'm6 6 27 6-2 10-10-2-4 15-6-2 4-15-11-2Z',
    cut: 'm16 23 3 1m-4 3 3 1m-4 3 3 1',
    action: 'M3 22h7m-9 5h7',
    motion: 'rebound',
  },
  'SH-S2': {
    body: 'm17 5 20 6-3 10-7-2-5 17-6-2 5-17-7-2Z',
    action: 'M10 32C0 25 2 11 11 7m-6 0h6v6',
    motion: 'rebound',
  },
  'SH-C1': {
    body: 'M4 9h32v16H4Zm13 16h6v10h-6Z',
    cut: 'M8 13h24v8H8Z',
    action: 'M5 4h30M5 2v4m30-4v4',
    motion: 'strike',
  },
  'SH-C2': {
    body: 'M12 4h16v9H12Zm5 9h6v13h-6Z',
    ground:
      'M14 26c-5 5 17 5 12 0M9 23c-16 13 38 13 22 0M4 22c-16 19 48 19 32 0',
    motion: 'pulse',
  },
  'SH-T1': {
    body: 'm17 4 21 6-3 11-8-2-5 17-6-2 5-17-7-2Z',
    action: 'M9 32C-1 20 4 9 12 5m-5 0h5v6M5 20h4m-3 5 4-2',
    motion: 'swing',
  },
  'SH-T2': {
    body: 'm17 4 21 6-3 11-8-2-5 17-6-2 5-17-7-2Z',
    cut: 'm21 8 12 4-1 4-12-4Z',
    action: 'M4 33V18m4 15V13m4 15V7',
    motion: 'swing',
  },
  'SH-T3': {
    body: 'M8 3h23v10H8Zm8 10h6v13h-6Z',
    ground: 'm3 32 7-7 4 7-6 5Zm24-8 9 3-1 10-11-4Zm-11 7 4-5 3 12',
    action: 'm3 22 4 1m27-5 3-2',
    motion: 'peel',
  },
  // Breaker: piston, flywheel, bits and repeated industrial contact.
  'PB-P1': {
    body: 'M12 4h16v8H12Zm5 8h6v11h6v5H11v-5h6Zm0 16h6v7h-6Z',
    cut: 'M15 7h10',
    ground: 'm7 35 6-3 7 5 7-5 6 3',
    motion: 'strike',
  },
  'PB-P2': {
    body: 'M8 5h24v11H8Zm9 11h6v7h9v6H8v-6h9Zm0 13h6v6h-6Z',
    cut: 'M12 8h16v5H12Z',
    ground: 'M4 8v19m32-19v19',
    motion: 'strike',
  },
  'PB-P3': {
    body: 'M11 4h18v15h-5v7h-8v-7h-5Zm5 22h8v9h-8Z',
    cut: 'M15 8h10m-10 4h10',
    action: 'M5 8v18l-3-3m33-15v18l3-3',
    ground: 'm10 34 4-3m12 0 4 3',
    motion: 'strike',
  },
  'PB-S1': {
    body: 'M20 5a15 15 0 1 0 0 30 15 15 0 0 0 0-30Zm0 5a10 10 0 1 1 0 20 10 10 0 0 1 0-20Z',
    cut: 'M20 16v8m-4-4h8',
    action: 'M20 10v5m10 5h-5m-5 10v-5m-10-5h5',
    motion: 'spin',
  },
  'PB-S2': {
    body: 'M13 4a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm14 13a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm0 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z',
    ground: 'm20 6 15 18M5 19l17 16',
    motion: 'spin',
  },
  'PB-S3': {
    body: 'M20 9a11 11 0 1 0 0 22 11 11 0 0 0 0-22Zm0 5a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z',
    action: 'M5 11c5-8 21-9 29 2m-1-7 1 7-7-1M4 25l3 5m2 3 4 2',
    motion: 'spin',
  },
  'PB-C1': {
    body: 'M13 4h14v9l-4 7-3 16-3-16-4-7Z',
    cut: 'M17 7h6m-3 9v10',
    ground: 'M6 24v12h7m14 0h7V24',
    motion: 'strike',
  },
  'PB-C2': {
    body: 'M15 4h10v14l10 11v6H5v-6l10-11Z',
    cut: 'M18 8v13l-9 10h22l-9-10V8',
    motion: 'strike',
  },
  'PB-T1': {
    body: 'M14 4h12v15l-3 5v8h-6v-8l-3-5Z',
    cut: 'M18 8h4m-4 4h4',
    action:
      'M9 17c-5 5-5 11 0 16M5 13c-9 9-9 17 0 24m26-20c5 5 5 11 0 16m4-20c9 9 9 17 0 24',
    motion: 'pulse',
  },
  'PB-T2': {
    body: 'M14 3h12v14l-4 6v10h-4V23l-4-6Z',
    ground: 'm2 27 8-3 3 10-7 2Zm28 2 6-5 2 10-8 3Z',
    action: 'M11 18 5 20m24-2 6 2M7 14l-4 2m30-2 4 2',
    motion: 'peel',
  },
  // Thermal: flame profiles, vessels, retained heat and delayed waves.
  'TH-P1': {
    body: 'M22 3c3 11 12 13 11 22-1 16-28 16-27 0 0-6 4-11 8-14-1 8 2 11 5 10 4-3 0-10 3-18Z',
    cut: 'M20 23c-8 8-1 13 4 8 3-4-1-7-4-8Z',
    motion: 'heat',
  },
  'TH-P2': {
    body: 'm9 6 9-3 4 13-4 6-6-2Zm9 16c3-3 5-4 6-1l7 15c-8-4-12-9-13-14Z',
    cut: 'm13 7 3 10m7 9 4 5',
    ground: 'M5 30h8m18-15 3-4m0 11h4',
    motion: 'heat',
  },
  'TH-P3': {
    body: 'M20 3c1 9 10 17 10 24 0 15-23 13-21-2 1-6 5-12 6-17 5 7 4 10 6 11 2-4-2-9-1-16Z',
    cut: 'M19 22c-6 8-3 12 1 12s6-4-1-12Z',
    action: 'M4 16l3 2m26 0 3-2M5 6l3 5m24 0 3-5',
    motion: 'heat',
  },
  'TH-S1': {
    body: 'M16 3h8v5c7 1 8 5 8 10v16H8V18c0-5 1-9 8-10Z',
    cut: 'M12 18h16v12H12Zm7-12h2m-2 5h2',
    action: 'M35 18v15m-2-3 2 3 2-3',
    motion: 'rebound',
  },
  'TH-S2': {
    body: 'M14 5h12v5l5 5v19H9V15l5-5Zm6 11c-1 5-6 7-6 11 0 7 12 7 12 0 0-4-5-6-6-11Z',
    cut: 'M17 7h6',
    action: 'M3 15v15m0-15 4 4m26-2 3-4',
    motion: 'heat',
  },
  'TH-S3': {
    body: 'M16 10h8v5l5 4v16H11V19l5-4Zm0 12h8v9h-8Z',
    action: 'M8 14c-3-11 17-15 23-5m-5-2 5 2 2-6M20 3v4m-3-3 3 3 3-3',
    motion: 'rebound',
  },
  'TH-C1': {
    body: 'M15 4h10v9l-5 7-5-7Zm5 17L5 35h30Z',
    cut: 'M18 7h4m-2 18v7m-3-6-5 6m11-6 5 6',
    motion: 'heat',
  },
  'TH-C2': {
    body: 'M16 3h8v9l-4 6-4-6Zm4 16L3 31l3 6h28l3-6Z',
    cut: 'M20 23v11m-3-10-9 9m15-9 9 9',
    action: 'M5 14l-3 6 6-1m27-5 3 6-6-1',
    motion: 'heat',
  },
  'TH-C3': {
    body: 'M16 3h8v10l-4 5-4-5Zm4 16L3 29l6 7h22l6-7Z',
    cut: 'M20 22v11m-4-9-6 7m14-7 6 7',
    ground: 'M2 36h5m6 2h14m6-2h5',
    action: 'M6 14v5m28-5v5',
    motion: 'heat',
  },
  'TH-T1': {
    body: 'm5 25 14-4 16 4v10H5Z',
    cut: 'M9 29h22',
    action: 'M11 21c-6-6 5-9 0-15m9 13c-6-6 6-10 1-16m8 18c-6-6 5-9 0-15',
    motion: 'heat',
  },
  'TH-T2': {
    body: 'm4 23 13-5 18 5v13H4Z',
    cut: 'm8 25 10 3 13-3M8 31h23',
    action: 'M12 17c-6-6 5-9 0-14m8 11c-4-4 4-6 1-11m8 14c-6-6 5-9 0-14',
    motion: 'heat',
  },
  'TH-T3': {
    body: 'm12 26 8-4 8 4v9H12Z',
    cut: 'M16 30h8',
    action:
      'M9 26c-8-8-1-18 8-18m-12 21C-8 15 4 1 17 3m13 23c8-8 1-18-8-18m13 21C48 15 36 1 23 3',
    motion: 'pulse',
  },
};

export function UpgradeGlyph({
  node,
}: {
  node: Pick<ToolNode, 'id' | 'branch'> &
    Partial<Pick<ToolNode, 'glyph' | 'rank' | 'major'>>;
}) {
  const art = UPGRADE_ENGRAVINGS[node.glyph ?? node.id];
  if (!art) return null;
  return (
    <svg
      className={`upgrade-engraving motion-${art.motion ?? 'strike'}`}
      viewBox="0 0 40 40"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {art.ground && <path className="engraving-ground" d={art.ground} />}
      <g className="engraving-moving">
        <path
          className="engraving-solid"
          d={art.body}
          fill="currentColor"
          fillRule="evenodd"
          strokeWidth="0.4"
        />
        {art.cut && <path className="engraving-cut" d={art.cut} />}
        {!node.major && (node.rank ?? 1) > 1 && (
          <path
            className="engraving-cut fitting-grooves"
            d={Array.from(
              { length: Math.min(4, (node.rank ?? 1) - 1) },
              (_, i) => `M${15 + i * 3} 29v4`,
            ).join(' ')}
          />
        )}
      </g>
      {art.action && <path className="engraving-action" d={art.action} />}
    </svg>
  );
}

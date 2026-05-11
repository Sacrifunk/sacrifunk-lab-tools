import { useMemo } from "react";
import { Colors, GENERATORS, MULTIPLIER_PALETTE, NOTE12 } from "../lib/scales";
import { computeVortex, nodePos, stabilityScore } from "../lib/computeVortex";

export interface VortexSVGProps {
  N: number;
  multipliers: number[];
  scalePositions?: number[];
  showLabels?: boolean;
  showJI?: boolean;
  size?: number;
  /** Optional accessible label for screen readers. */
  ariaLabel?: string;
}

const JI_LABELS_N9: Record<number, string> = {
  1: "C/E",
  2: "C/E",
  3: "G/B",
  4: "C/E",
  5: "C/E",
  6: "G/B",
  7: "C/E",
  8: "C/E",
  9: "D/F#",
};

export function VortexSVG({
  N,
  multipliers,
  scalePositions,
  showLabels = false,
  showJI = false,
  size = 420,
  ariaLabel,
}: VortexSVGProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;
  const nodeR = Math.max(5, Math.min(18, 220 / N));

  const positions = useMemo(() => {
    const p: Record<number, { x: number; y: number }> = {};
    for (let i = 1; i <= N; i++) p[i] = nodePos(i, N, cx, cy, r);
    return p;
  }, [N, cx, cy, r]);

  const vortices = useMemo(
    () => multipliers.map((m) => ({ mult: m, ...computeVortex(N, m) })),
    [N, multipliers],
  );

  const allInCycle = useMemo(() => {
    const s = new Set<number>();
    vortices.forEach((v) => v.inCycle.forEach((n) => s.add(n)));
    return s;
  }, [vortices]);

  const scores = useMemo(() => {
    if (N > 20) return {} as Record<number, number>;
    const s: Record<number, number> = {};
    for (let i = 1; i <= N; i++) s[i] = stabilityScore(i, GENERATORS, N);
    return s;
  }, [N]);

  const scaleSet = new Set(scalePositions ?? []);
  const computedLabel =
    ariaLabel ??
    `Vortex diagram for N=${N}, multipliers ${multipliers.map((m) => `times ${m}`).join(", ")}`;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      style={{ width: "100%", maxWidth: size, display: "block" }}
      role="img"
      aria-label={computedLabel}
    >
      <defs>
        <radialGradient id="vbg">
          <stop offset="0%" stopColor="#1a1a30" />
          <stop offset="100%" stopColor="#0a0a14" />
        </radialGradient>
        <filter id="gl">
          <feGaussianBlur stdDeviation="2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle cx={cx} cy={cy} r={r + 24} fill="url(#vbg)" />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#2a2a4a"
        strokeWidth="1"
        opacity="0.4"
      />

      {vortices.map((v, vi) => {
        const col = MULTIPLIER_PALETTE[vi % MULTIPLIER_PALETTE.length];
        const opacity = multipliers.length > 1 ? 0.5 : 0.85;
        return (
          <g key={`v${vi}`}>
            {v.chains?.map((ch, ci) =>
              ch.slice(0, -1).map((node, i) => {
                const n = ch[i + 1];
                const p1 = positions[node];
                const p2 = positions[n];
                if (!p1 || !p2) return null;
                return (
                  <line
                    key={`f${vi}-${ci}-${i}`}
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke={Colors.feeder}
                    strokeWidth="1"
                    opacity={opacity * 0.5}
                  />
                );
              }),
            )}
            {v.cycles.map((cy0, ci) =>
              cy0.map((node, i) => {
                const next = cy0[(i + 1) % cy0.length];
                const p1 = positions[node];
                const p2 = positions[next];
                if (!p1 || !p2) return null;
                return (
                  <line
                    key={`c${vi}-${ci}-${i}`}
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke={col}
                    strokeWidth={multipliers.length > 1 ? 1.5 : 2}
                    opacity={opacity}
                    filter="url(#gl)"
                  />
                );
              }),
            )}
          </g>
        );
      })}

      {Array.from({ length: N }, (_, i) => i + 1).map((n) => {
        const p = positions[n];
        if (!p) return null;
        const isAxis = n === N;
        const inScale = scaleSet.has(n);
        const isInAnyCycle = allInCycle.has(n);
        const sc = scores[n];

        const fill = isAxis
          ? Colors.axis
          : isInAnyCycle
            ? Colors.loop
            : "#2a2a4a";
        const strokeCol = inScale ? "#ffd700" : "none";
        const sw = inScale ? 2.5 : 0;

        let label = String(n);
        if (N === 12 && showLabels) label = NOTE12[n - 1];
        if (N === 9 && showJI) label = JI_LABELS_N9[n] ?? String(n);

        return (
          <g key={`n${n}`}>
            {inScale && (
              <circle
                cx={p.x}
                cy={p.y}
                r={nodeR + 4}
                fill="none"
                stroke="#ffd700"
                strokeWidth="1.5"
                opacity="0.4"
              />
            )}
            <circle
              cx={p.x}
              cy={p.y}
              r={nodeR}
              fill={fill}
              stroke={strokeCol}
              strokeWidth={sw}
              opacity={0.9}
            />
            {N <= 24 && (
              <text
                x={p.x}
                y={p.y + (N === 12 && showJI ? -nodeR - 6 : 0)}
                textAnchor="middle"
                dominantBaseline="central"
                fill={isAxis ? "#000" : "#fff"}
                fontSize={Math.max(7, nodeR * 0.75)}
                fontWeight="bold"
                fontFamily="'JetBrains Mono', monospace"
              >
                {label}
              </text>
            )}
            {N === 12 && showJI && sc !== undefined && (
              <text
                x={p.x}
                y={p.y + nodeR + 10}
                textAnchor="middle"
                fill={sc >= 4 ? "#22cc66" : sc >= 3 ? "#ffd700" : "#ff5566"}
                fontSize="8"
                fontFamily="'JetBrains Mono', monospace"
              >
                {sc}/5
              </text>
            )}
          </g>
        );
      })}

      <text
        x={8}
        y={size - 8}
        fill={Colors.dim}
        fontSize="9"
        fontFamily="'JetBrains Mono', monospace"
      >
        {multipliers.map((m) => `×${m}`).join(" + ")} on {N}-class
      </text>
    </svg>
  );
}

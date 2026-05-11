import { useMemo } from "react";
import { Colors, MULTIPLIER_PALETTE } from "../lib/scales";
import { computeVortex, gcd } from "../lib/computeVortex";

export interface AnalysisPanelProps {
  N: number;
  multipliers: number[];
}

interface MultiplierResult {
  mult: number;
  loops: number;
  feeders: number;
  cycles: number[][];
  gcd: number;
}

export function AnalysisPanel({ N, multipliers }: AnalysisPanelProps) {
  const results = useMemo<MultiplierResult[]>(
    () =>
      multipliers.map((m) => {
        const v = computeVortex(N, m);
        const realLoops = v.cycles.filter(
          (c) => !(c.length === 1 && c[0] === N),
        );
        return {
          mult: m,
          loops: realLoops.length,
          feeders: v.feeders.length,
          cycles: v.cycles,
          gcd: gcd(m, N),
        };
      }),
    [N, multipliers],
  );

  return (
    <section
      aria-labelledby="cycle-analysis-heading"
      style={{
        background: Colors.panel,
        borderRadius: 10,
        padding: "12px 14px",
        border: `1px solid ${Colors.panelB}`,
        fontSize: 12,
        color: Colors.text,
      }}
    >
      <div
        id="cycle-analysis-heading"
        style={{
          fontSize: 11,
          color: Colors.dim,
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 8,
        }}
      >
        Cycle Analysis
      </div>
      <div aria-live="polite">
        {results.map((r, i) => (
          <div
            key={i}
            style={{
              marginBottom: 6,
              padding: "6px 8px",
              background: "#0a0a14",
              borderRadius: 6,
              border: "1px solid #1a1a2a",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  color: MULTIPLIER_PALETTE[i % MULTIPLIER_PALETTE.length],
                  fontWeight: "bold",
                }}
              >
                ×{r.mult}
              </span>
              <span style={{ color: Colors.dim }}>gcd={r.gcd}</span>
              <span>
                <span style={{ color: Colors.loop }}>L{r.loops}</span>{" "}
                <span style={{ color: Colors.feeder }}>F{r.feeders}</span>
              </span>
            </div>
            <div
              style={{
                fontSize: 10,
                color: Colors.dim,
                marginTop: 3,
              }}
            >
              {r.cycles.map((cy, ci) => {
                const isAxis = cy.length === 1 && cy[0] === N;
                const label = isAxis
                  ? `${N}→${N}(axis)`
                  : cy.join("→") + "→" + cy[0];
                return (
                  <span
                    key={ci}
                    style={{
                      marginRight: 6,
                      color: isAxis ? Colors.axis : Colors.loop,
                    }}
                  >
                    {label}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
        <div
          style={{
            marginTop: 8,
            fontSize: 10,
            color: Colors.dim,
            lineHeight: 1.6,
          }}
        >
          {results.map((r, i) => {
            const isPerm = r.gcd === 1;
            return (
              <div key={i}>
                Law I: gcd({r.mult},{N})={r.gcd} →{" "}
                {isPerm
                  ? "permutation (F=0) ✅"
                  : "contraction (F>0) ✅"}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

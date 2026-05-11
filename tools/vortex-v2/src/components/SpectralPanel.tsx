import { useMemo } from "react";
import { Colors, JI5, NOTE12, SCALES } from "../lib/scales";

export interface SpectralPanelProps {
  scaleName: string;
}

interface Triad {
  deg: number;
  notes: [string, string, string];
  quality: string;
  pure: boolean;
}

export function SpectralPanel({ scaleName }: SpectralPanelProps) {
  const triads = useMemo<Triad[]>(() => {
    const scale = SCALES[scaleName];
    if (!scale || scale.length > 8) return [];

    const results: Triad[] = [];
    const n = scale.length;

    for (let deg = 0; deg < Math.min(n, 7); deg++) {
      const i0 = scale[deg % n];
      const i1 = scale[(deg + 2) % n];
      const i2 = scale[(deg + 4) % n];
      const r0 = JI5[i0 % 12];
      const r1 = JI5[i1 % 12];
      const r2 = JI5[i2 % 12];

      const ratios: number[] = [1, r1 / r0, r2 / r0];
      for (let k = 1; k < 3; k++) {
        while (ratios[k] < 1) ratios[k] *= 2;
        while (ratios[k] > 2) ratios[k] /= 2;
      }
      if (ratios[2] < ratios[1]) ratios[2] *= 2;

      const int1 = Math.round(1200 * Math.log2(ratios[1]));
      const int2 = Math.round(1200 * Math.log2(ratios[2]));

      let quality = "?";
      if (int1 > 350 && int1 < 420 && int2 > 680 && int2 < 720) quality = "Maj";
      else if (int1 > 280 && int1 < 330 && int2 > 680 && int2 < 720)
        quality = "min";
      else if (int1 > 280 && int1 < 330 && int2 > 580 && int2 < 660)
        quality = "dim";
      else if (int1 > 350 && int1 < 420 && int2 > 750 && int2 < 820)
        quality = "aug";
      else quality = `${int1}¢`;

      const hasF = [i0, i1, i2].some((x) => x % 12 === 6);

      results.push({
        deg: deg + 1,
        notes: [
          NOTE12[i0 % 12],
          NOTE12[i1 % 12],
          NOTE12[i2 % 12],
        ],
        quality,
        pure: !hasF,
      });
    }

    return results;
  }, [scaleName]);

  if (triads.length === 0) return null;

  return (
    <section
      aria-labelledby="spectral-heading"
      style={{
        background: Colors.panel,
        borderRadius: 10,
        padding: "12px 14px",
        border: `1px solid ${Colors.panelB}`,
        fontSize: 11,
        color: Colors.text,
      }}
    >
      <div
        id="spectral-heading"
        style={{
          fontSize: 11,
          color: Colors.dim,
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 8,
        }}
      >
        Spectral Coherence
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
          gap: 4,
        }}
      >
        {triads.map((t) => (
          <div
            key={t.deg}
            style={{
              padding: "4px 6px",
              borderRadius: 4,
              fontSize: 10,
              background: t.pure ? "#0a1a0a" : "#1a0a0a",
              border: `1px solid ${t.pure ? "#224422" : "#332222"}`,
            }}
          >
            <div
              style={{
                fontWeight: "bold",
                color: t.pure ? "#22cc66" : "#ff5566",
              }}
            >
              {t.deg}. {t.notes.join("-")}
            </div>
            <div style={{ color: Colors.dim }}>
              {t.quality} {t.pure ? "✅ pure" : "❌ F# beat"}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

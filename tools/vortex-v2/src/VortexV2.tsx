import { useCallback, useMemo, useState } from "react";
import { VortexSVG } from "./components/VortexSVG";
import { AnalysisPanel } from "./components/AnalysisPanel";
import { SpectralPanel } from "./components/SpectralPanel";
import { CymaticsMini } from "./components/CymaticsMini";
import {
  Colors,
  GENERATORS,
  MULTIPLIER_PALETTE,
  NOTE12,
  SCALES,
} from "./lib/scales";
import { stabilityScore } from "./lib/computeVortex";

type Tab = "vortex" | "cymatics" | "compare";

const TABS: { key: Tab; label: string }[] = [
  { key: "vortex", label: "VORTEX" },
  { key: "cymatics", label: "CYMATICS" },
  { key: "compare", label: "COMPARE" },
];

const N_PRESETS = [9, 12, 19, 27, 31, 32, 53, 64, 81] as const;
const MULTIPLIER_CHOICES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;
const CYMATICS_NOTES = [
  { n: "C", f: 256 },
  { n: "D", f: 288 },
  { n: "E", f: 320 },
  { n: "F", f: 341.33 },
  { n: "G", f: 384 },
  { n: "A", f: 426.67 },
  { n: "B", f: 480 },
  { n: "C₂", f: 64 },
  { n: "E₂", f: 80 },
  { n: "G₂", f: 96 },
  { n: "C₁", f: 32 },
  { n: "E₁", f: 40 },
  { n: "G₁", f: 48 },
] as const;

const visuallyHidden: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  border: 0,
};

export function VortexV2() {
  const [N, setN] = useState(12);
  const [mults, setMults] = useState<number[]>([2]);
  const [scaleName, setScaleName] = useState("Sacrifunk");
  const [showScale, setShowScale] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showJI, setShowJI] = useState(true);
  const [tab, setTab] = useState<Tab>("vortex");
  const [cyFreq, setCyFreq] = useState(256);

  const toggleMult = useCallback((m: number) => {
    setMults((prev) =>
      prev.includes(m)
        ? prev.length > 1
          ? prev.filter((x) => x !== m)
          : prev
        : [...prev, m],
    );
  }, []);

  const scalePositions = useMemo(() => {
    if (!showScale || N !== 12) return [];
    const sc = SCALES[scaleName];
    return sc ? sc.map((s) => (s % 12) + 1) : [];
  }, [showScale, N, scaleName]);

  const stabSummary = useMemo(() => {
    if (N !== 12 || !showScale) return null;
    const sc = SCALES[scaleName];
    if (!sc) return null;
    const positions = sc.map((s) => (s % 12) + 1);
    const scores = positions.map((p) => stabilityScore(p, GENERATORS, 12));
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return {
      scores,
      avg,
      notes: positions.map((p) => NOTE12[p - 1]),
    };
  }, [N, showScale, scaleName]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: Colors.bg,
        color: Colors.text,
        fontFamily: "'JetBrains Mono', monospace",
        padding: 12,
      }}
    >
      <header style={{ textAlign: "center", marginBottom: 12 }}>
        <h1
          style={{
            fontSize: 22,
            color: Colors.accent,
            margin: 0,
            letterSpacing: 2,
          }}
        >
          SACRIFUNK VORTEX EXPLORER v2
        </h1>
        <p style={{ fontSize: 10, color: Colors.dim, margin: "2px 0" }}>
          Multi-Generator · Scale Overlay · JI Frequencies · Stability Scores ·
          Spectral Coherence · Cymatics
        </p>
      </header>

      <div
        role="tablist"
        aria-label="Vortex tool views"
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 4,
          marginBottom: 12,
        }}
      >
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            aria-controls={`panel-${key}`}
            id={`tab-${key}`}
            onClick={() => setTab(key)}
            style={{
              padding: "5px 16px",
              background: tab === key ? Colors.accent : "#1a1a2e",
              border: `1px solid ${tab === key ? Colors.accent : "#333"}`,
              color: tab === key ? "#fff" : "#cccccc",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 10,
              letterSpacing: 1,
              fontFamily: "inherit",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "vortex" && (
        <div
          role="tabpanel"
          id="panel-vortex"
          aria-labelledby="tab-vortex"
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
            maxWidth: 1100,
            margin: "0 auto",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <VortexSVG
              N={N}
              multipliers={mults}
              scalePositions={scalePositions}
              showLabels={showLabels}
              showJI={showJI}
              size={420}
            />
          </div>

          <div
            style={{
              flex: "0 0 320px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {/* Base N */}
            <fieldset
              style={{
                background: Colors.panel,
                borderRadius: 10,
                padding: "10px 14px",
                border: `1px solid ${Colors.panelB}`,
                margin: 0,
              }}
            >
              <legend
                style={{
                  fontSize: 10,
                  color: Colors.dim,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  padding: "0 4px",
                }}
              >
                Base N
              </legend>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <label htmlFor="n-range" style={visuallyHidden}>
                  Modulus N (slider, 3 to 64)
                </label>
                <input
                  id="n-range"
                  type="range"
                  min={3}
                  max={64}
                  value={N}
                  aria-valuetext={`${N}`}
                  onChange={(e) => setN(Number(e.target.value))}
                  style={{ flex: 1, accentColor: Colors.accent }}
                />
                <label htmlFor="n-number" style={visuallyHidden}>
                  Modulus N (number, 3 to 999)
                </label>
                <input
                  id="n-number"
                  type="number"
                  value={N}
                  min={3}
                  max={999}
                  onChange={(e) => setN(Number(e.target.value))}
                  style={{
                    width: 50,
                    background: "#1a1a2e",
                    border: "1px solid #333",
                    color: Colors.accent,
                    padding: "3px 6px",
                    borderRadius: 4,
                    fontSize: 14,
                    fontWeight: "bold",
                    textAlign: "center",
                    fontFamily: "inherit",
                  }}
                />
              </div>
              <div
                role="group"
                aria-label="Quick N presets"
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 3,
                  marginTop: 6,
                }}
              >
                {N_PRESETS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={N === n}
                    onClick={() => setN(n)}
                    style={{
                      padding: "2px 8px",
                      background: N === n ? "#2a2a5a" : "#0a0a14",
                      border: `1px solid ${N === n ? "#4444aa" : "#222"}`,
                      color: N === n ? "#aaf" : "#aaaaaa",
                      borderRadius: 3,
                      cursor: "pointer",
                      fontSize: 9,
                      fontFamily: "inherit",
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Multipliers */}
            <fieldset
              style={{
                background: Colors.panel,
                borderRadius: 10,
                padding: "10px 14px",
                border: `1px solid ${Colors.panelB}`,
                margin: 0,
              }}
            >
              <legend
                style={{
                  fontSize: 10,
                  color: Colors.dim,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  padding: "0 4px",
                }}
              >
                Generators (multi-select)
              </legend>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                {MULTIPLIER_CHOICES.map((m) => {
                  const active = mults.includes(m);
                  const col = active
                    ? MULTIPLIER_PALETTE[
                        mults.indexOf(m) % MULTIPLIER_PALETTE.length
                      ]
                    : "#888888";
                  return (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={active}
                      aria-label={`Multiplier times ${m}`}
                      onClick={() => toggleMult(m)}
                      style={{
                        padding: "3px 10px",
                        background: active ? "#1a1a3a" : "#0a0a14",
                        border: `1px solid ${col}`,
                        color: col,
                        borderRadius: 4,
                        cursor: "pointer",
                        fontSize: 11,
                        fontWeight: active ? "bold" : "normal",
                        fontFamily: "inherit",
                      }}
                    >
                      ×{m}
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: 9, color: Colors.dim, marginTop: 4 }}>
                Active: {mults.map((m) => `×${m}`).join(" + ")} | Musical: ×2=oct
                ×3=m3 ×5=P4 ×7=P5 ×11=M7
              </div>
            </fieldset>

            {/* Scale overlay (N=12 only) */}
            {N === 12 && (
              <fieldset
                style={{
                  background: Colors.panel,
                  borderRadius: 10,
                  padding: "10px 14px",
                  border: `1px solid ${Colors.panelB}`,
                  margin: 0,
                }}
              >
                <legend
                  style={{
                    fontSize: 10,
                    color: Colors.dim,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    padding: "0 4px",
                  }}
                >
                  Scale Overlay
                </legend>
                <label
                  style={{
                    fontSize: 10,
                    color: Colors.dim,
                    cursor: "pointer",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={showScale}
                    onChange={(e) => setShowScale(e.target.checked)}
                    style={{ accentColor: Colors.axis, marginRight: 4 }}
                  />
                  Show overlay on diagram
                </label>
                <label htmlFor="scale-select" style={visuallyHidden}>
                  Scale name
                </label>
                <select
                  id="scale-select"
                  value={scaleName}
                  onChange={(e) => setScaleName(e.target.value)}
                  style={{
                    width: "100%",
                    background: "#1a1a2e",
                    border: "1px solid #333",
                    color: Colors.text,
                    padding: "4px 8px",
                    borderRadius: 4,
                    fontSize: 11,
                    fontFamily: "inherit",
                  }}
                >
                  {Object.keys(SCALES).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                {stabSummary && showScale && (
                  <div
                    aria-live="polite"
                    style={{ marginTop: 6, fontSize: 10, color: Colors.dim }}
                  >
                    <div>
                      Avg stability:{" "}
                      <span
                        style={{
                          color:
                            stabSummary.avg >= 3.7
                              ? "#22cc66"
                              : stabSummary.avg >= 3.5
                                ? "#ffd700"
                                : "#ff5566",
                          fontWeight: "bold",
                        }}
                      >
                        {stabSummary.avg.toFixed(2)}/5
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 2,
                        marginTop: 3,
                      }}
                    >
                      {stabSummary.notes.map((n, i) => (
                        <span
                          key={i}
                          style={{
                            padding: "1px 5px",
                            borderRadius: 3,
                            fontSize: 9,
                            background:
                              stabSummary.scores[i] >= 4
                                ? "#0a2a0a"
                                : stabSummary.scores[i] >= 3
                                  ? "#1a1a0a"
                                  : "#2a0a0a",
                            color:
                              stabSummary.scores[i] >= 4
                                ? "#22cc66"
                                : stabSummary.scores[i] >= 3
                                  ? "#ffd700"
                                  : "#ff5566",
                            border: "1px solid #222",
                          }}
                        >
                          {n}:{stabSummary.scores[i]}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </fieldset>
            )}

            {/* Display options */}
            <fieldset
              style={{
                background: Colors.panel,
                borderRadius: 10,
                padding: "8px 14px",
                border: `1px solid ${Colors.panelB}`,
                display: "flex",
                gap: 12,
                margin: 0,
              }}
            >
              <legend style={visuallyHidden}>Display options</legend>
              <label
                style={{ fontSize: 10, color: Colors.dim, cursor: "pointer" }}
              >
                <input
                  type="checkbox"
                  checked={showLabels}
                  onChange={(e) => setShowLabels(e.target.checked)}
                  style={{ accentColor: Colors.accent, marginRight: 4 }}
                />
                Note names
              </label>
              <label
                style={{ fontSize: 10, color: Colors.dim, cursor: "pointer" }}
              >
                <input
                  type="checkbox"
                  checked={showJI}
                  onChange={(e) => setShowJI(e.target.checked)}
                  style={{ accentColor: Colors.accent, marginRight: 4 }}
                />
                JI / Scores
              </label>
            </fieldset>

            <AnalysisPanel N={N} multipliers={mults} />

            {N === 12 && showScale && <SpectralPanel scaleName={scaleName} />}
          </div>
        </div>
      )}

      {tab === "cymatics" && (
        <div
          role="tabpanel"
          id="panel-cymatics"
          aria-labelledby="tab-cymatics"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <CymaticsMini freq={cyFreq} size={360} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label htmlFor="cy-range" style={visuallyHidden}>
              Cymatics frequency (slider, 20 to 2000 Hz)
            </label>
            <input
              id="cy-range"
              type="range"
              min={20}
              max={2000}
              value={cyFreq}
              aria-valuetext={`${cyFreq} hertz`}
              onChange={(e) => setCyFreq(Number(e.target.value))}
              style={{ width: 250, accentColor: Colors.accent }}
            />
            <label htmlFor="cy-number" style={visuallyHidden}>
              Cymatics frequency in Hz
            </label>
            <input
              id="cy-number"
              type="number"
              value={cyFreq}
              onChange={(e) => setCyFreq(Number(e.target.value))}
              style={{
                width: 60,
                background: "#1a1a2e",
                border: "1px solid #333",
                color: Colors.accent,
                padding: "3px",
                borderRadius: 4,
                fontSize: 14,
                textAlign: "center",
                fontFamily: "inherit",
              }}
            />
            <span style={{ fontSize: 11, color: Colors.dim }} aria-hidden="true">
              Hz
            </span>
          </div>
          <div
            role="group"
            aria-label="Frequency presets"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 4,
              justifyContent: "center",
            }}
          >
            {CYMATICS_NOTES.map((p) => {
              const active = Math.abs(cyFreq - p.f) < 0.5;
              return (
                <button
                  key={p.n}
                  type="button"
                  aria-pressed={active}
                  aria-label={`${p.n} at ${p.f} hertz`}
                  onClick={() => setCyFreq(p.f)}
                  style={{
                    padding: "3px 10px",
                    background: active ? "#ff3355" : "#1a1a2e",
                    border: "1px solid #333",
                    color: active ? "#fff" : "#cccccc",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 10,
                    fontFamily: "inherit",
                  }}
                >
                  {p.n}={p.f}
                </button>
              );
            })}
          </div>
          <p
            style={{
              fontSize: 10,
              color: Colors.dim,
              maxWidth: 400,
              textAlign: "center",
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            Chladni plate simulation. Bright lines = nodal patterns where
            particles accumulate. Real physics — wave equation ∇²u = -(ω²/c²)u
            on a bounded circular domain.
          </p>
        </div>
      )}

      {tab === "compare" && (
        <div
          role="tabpanel"
          id="panel-compare"
          aria-labelledby="tab-compare"
          style={{ maxWidth: 700, margin: "0 auto" }}
        >
          <p
            style={{
              fontSize: 11,
              color: Colors.dim,
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 12,
              textAlign: "center",
            }}
          >
            Side-by-side: ×2 vs ×7 on 12-class
          </p>
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 12, color: Colors.loop, marginBottom: 4 }}>
                ×2 (Octave)
              </div>
              <VortexSVG
                N={12}
                multipliers={[2]}
                scalePositions={scalePositions}
                showLabels
                size={280}
              />
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 12, color: Colors.blue, marginBottom: 4 }}>
                ×7 (Perfect Fifth)
              </div>
              <VortexSVG
                N={12}
                multipliers={[7]}
                scalePositions={scalePositions}
                showLabels
                size={280}
              />
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
              marginTop: 12,
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{ fontSize: 12, color: Colors.purple, marginBottom: 4 }}
              >
                ×5 (Perfect Fourth)
              </div>
              <VortexSVG
                N={12}
                multipliers={[5]}
                scalePositions={scalePositions}
                showLabels
                size={280}
              />
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "#ff8800", marginBottom: 4 }}>
                ×11 (Mirror/M7)
              </div>
              <VortexSVG
                N={12}
                multipliers={[11]}
                scalePositions={scalePositions}
                showLabels
                size={280}
              />
            </div>
          </div>
          <p
            style={{
              textAlign: "center",
              marginTop: 8,
              fontSize: 10,
              color: Colors.dim,
            }}
          >
            Gold rings = {scaleName} scale notes. Only ×5, ×7, ×11 produce
            pure-loop graphs (coprime to 12).
          </p>
        </div>
      )}

      <footer
        style={{
          textAlign: "center",
          marginTop: 16,
          fontSize: 9,
          color: "#888888",
          letterSpacing: 1,
        }}
      >
        SACRIFUNK VORTEX EXPLORER v2 · Built on the Five Laws of Loop-Feeder
        Decomposition · March 2026
      </footer>
    </div>
  );
}

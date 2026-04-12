import { useState, useMemo, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════
// VORTEX ENGINE
// ═══════════════════════════════════════════════════════════════
function vortex(N, k) {
  if (N < 2) return { cyc: [], feed: [], inC: new Set(), map: {} };
  const mod = x => { const r = x % N; return r === 0 ? N : r; };
  const map = {}; for (let i = 1; i <= N; i++) map[i] = mod(i * k);
  const vis = new Set(), inC = new Set(), cyc = [];
  for (let s = 1; s <= N; s++) {
    if (vis.has(s)) continue;
    const p = [], ps = new Set(); let c = s;
    while (!vis.has(c) && !ps.has(c)) { p.push(c); ps.add(c); c = map[c]; }
    if (ps.has(c)) { const i = p.indexOf(c); const cy = p.slice(i); cy.forEach(n => inC.add(n)); cyc.push(cy); }
    p.forEach(n => vis.add(n));
  }
  const feed = []; for (let i = 1; i <= N; i++) if (!inC.has(i)) feed.push(i);
  return { cyc, feed, inC, map, N };
}

function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }
function v2(n) { let v = 0, m = n; while (m % 2 === 0) { v++; m = Math.floor(m / 2); } return { v, m }; }

// ═══════════════════════════════════════════════════════════════
// ANIMATED VORTEX DIAGRAM
// ═══════════════════════════════════════════════════════════════
function VortexDiag({ N, k, size = 300, highlight = null, animateIdx = -1 }) {
  const cx = size / 2, cy = size / 2, r = size * 0.38;
  const nodeR = Math.max(4, Math.min(14, 160 / N));
  const v = useMemo(() => vortex(N, k), [N, k]);

  const pos = useMemo(() => {
    const p = {};
    for (let i = 1; i <= N; i++) {
      const a = -Math.PI / 2 + 2 * Math.PI * (i - 1) / N;
      p[i] = { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
    }
    return p;
  }, [N, cx, cy, r]);

  // Build feeder chains
  const chains = useMemo(() => {
    const chs = [], used = new Set();
    for (const fn of v.feed) {
      if (used.has(fn)) continue;
      const ch = [fn]; used.add(fn); let c = v.map[fn];
      while (!v.inC.has(c) && !used.has(c)) { ch.push(c); used.add(c); c = v.map[c]; }
      ch.push(c); chs.push(ch);
    }
    return chs;
  }, [v]);

  const hlSet = new Set(highlight || []);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: "100%", maxWidth: size, display: "block" }}>
      <defs>
        <radialGradient id={`bg${N}${k}`}><stop offset="0%" stopColor="#1a1a30" /><stop offset="100%" stopColor="#0a0a14" /></radialGradient>
        <filter id="gw"><feGaussianBlur stdDeviation="2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <circle cx={cx} cy={cy} r={r + 16} fill={`url(#bg${N}${k})`} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#2a2a4a" strokeWidth="0.5" />

      {/* Feeder edges */}
      {chains.map((ch, ci) => ch.slice(0, -1).map((nd, i) => {
        const nx = ch[i + 1], p1 = pos[nd], p2 = pos[nx];
        return p1 && p2 ? <line key={`f${ci}${i}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
          stroke="#22cc66" strokeWidth="1" opacity="0.5" /> : null;
      }))}

      {/* Cycle edges */}
      {v.cyc.map((cy, ci) => cy.map((nd, i) => {
        const nx = cy[(i + 1) % cy.length], p1 = pos[nd], p2 = pos[nx];
        const isAnimated = animateIdx >= 0 && ci === animateIdx;
        return p1 && p2 ? <line key={`c${ci}${i}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
          stroke="#ff3355" strokeWidth={isAnimated ? 3 : 1.8} opacity={isAnimated ? 1 : 0.7}
          filter="url(#gw)" /> : null;
      }))}

      {/* Nodes */}
      {Array.from({ length: N }, (_, i) => i + 1).map(n => {
        const p = pos[n]; if (!p) return null;
        const isAx = n === N, isLoop = v.inC.has(n), isHl = hlSet.has(n);
        const fill = isHl ? "#ffd700" : isAx ? "#ffd700" : isLoop ? "#ff3355" : "#22cc66";
        const opacity = isHl ? 1 : (isLoop ? 0.85 : 0.6);
        return <g key={n}>
          {isHl && <circle cx={p.x} cy={p.y} r={nodeR + 5} fill="none" stroke="#ffd700" strokeWidth="2" opacity="0.5">
            <animate attributeName="r" values={`${nodeR + 3};${nodeR + 7};${nodeR + 3}`} dur="1.5s" repeatCount="indefinite" />
          </circle>}
          <circle cx={p.x} cy={p.y} r={nodeR} fill={fill} opacity={opacity} stroke={isAx ? "#fff" : "none"} strokeWidth={isAx ? 1 : 0} />
          {N <= 30 && <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central"
            fill={isAx || isHl ? "#000" : "#fff"} fontSize={Math.max(7, nodeR * 0.8)} fontWeight="bold"
            fontFamily="monospace">{n}</text>}
        </g>;
      })}

      {/* Legend */}
      <g transform={`translate(8, ${size - 28})`}>
        <circle cx={6} cy={0} r={4} fill="#ff3355" /><text x={14} y={4} fill="#888" fontSize="8" fontFamily="monospace">Loop</text>
        <circle cx={56} cy={0} r={4} fill="#22cc66" /><text x={64} y={4} fill="#888" fontSize="8" fontFamily="monospace">Feeder</text>
        <circle cx={116} cy={0} r={4} fill="#ffd700" /><text x={124} y={4} fill="#888" fontSize="8" fontFamily="monospace">Axis</text>
      </g>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// LESSON CONTENT
// ═══════════════════════════════════════════════════════════════
const LESSONS = [
  // LESSON 0: INTRO
  {
    title: "Welcome",
    subtitle: "What is a Vortex Diagram?",
    content: `Take any number N and arrange the numbers 1 through N in a circle. Now pick a multiplier k. For each number, draw an arrow to where it goes when multiplied by k (using modular arithmetic: if the result exceeds N, wrap around).

The result is a "functional graph" — every node has exactly one outgoing arrow. Some nodes form closed loops (CYCLES, shown in red). Others flow into cycles without being part of one (FEEDERS, shown in green). The number N itself always maps to N (the AXIS, shown in gold).

This simple construction reveals deep structure in number systems — structure that connects directly to musical tuning, cryptography, and signal processing.`,
    getParams: () => ({ N: 9, k: 2 }),
    challenge: "This is ×2 on 9 numbers. How many red loops do you see? How many green feeders?",
    answer: "2 loops (the 6-cycle 1→2→4→8→7→5 and the 2-cycle 3→6), 0 feeders. Every number participates in a cycle!",
  },
  // LESSON 1: LAW I
  {
    title: "Law I",
    subtitle: "The Coprimality Law",
    content: `LAW: The graph has NO feeders (every node is in a cycle) if and only if gcd(k, N) = 1.

When k and N share no common factor, multiplication by k is INVERTIBLE — every number has a unique preimage. An invertible map is a permutation, and permutations consist entirely of cycles.

When gcd(k, N) > 1, the map is NOT invertible — some numbers have no preimage, so they must be feeders.

This is the master theorem. All other laws are special cases or consequences.`,
    getParams: (step) => {
      const examples = [
        { N: 9, k: 2, note: "gcd(2,9)=1 → ALL loops, F=0 ✓" },
        { N: 9, k: 3, note: "gcd(3,9)=3 → FEEDERS appear! F=8" },
        { N: 12, k: 5, note: "gcd(5,12)=1 → ALL loops, F=0 ✓" },
        { N: 12, k: 2, note: "gcd(2,12)=2 → FEEDERS appear! F=9" },
        { N: 12, k: 6, note: "gcd(6,12)=6 → MAXIMUM feeders! F=11" },
      ];
      return examples[step % examples.length];
    },
    steps: 5,
    challenge: "Predict: will ×7 on 12 have feeders? (Hint: what is gcd(7,12)?)",
    answer: "gcd(7,12) = 1, so NO feeders — pure cycles. Every note in chromatic space participates in a cycle under the perfect fifth!",
  },
  // LESSON 2: LAW II
  {
    title: "Law II",
    subtitle: "Odd Numbers Are Closed Systems",
    content: `LAW: When N is odd, the ×2 map has ZERO feeders. Every number participates in a cycle.

This is a direct consequence of Law I: if N is odd, then gcd(2, N) = 1 (since 2 and any odd number share no factors).

Musically, this means: in any odd-numbered system (like 9-EDO), octave doubling is a perfect permutation — no information is lost. The 9-class digital root system preserves everything under octave transposition.

Compare this to 12-class (N=12, even): gcd(2,12)=2, so octave doubling CREATES feeders — 9 of 12 chromatic notes are structurally 'lost' under ×2.`,
    getParams: (step) => {
      const examples = [
        { N: 7, k: 2, note: "N=7 (odd): F=0, all loops ✓" },
        { N: 8, k: 2, note: "N=8 (even): F=7! Only axis survives" },
        { N: 9, k: 2, note: "N=9 (odd): F=0, all loops ✓" },
        { N: 10, k: 2, note: "N=10 (even): feeders appear" },
        { N: 11, k: 2, note: "N=11 (odd): F=0, one big loop ✓" },
        { N: 12, k: 2, note: "N=12 (even): F=9! Only Eb↔G + B survive" },
      ];
      return examples[step % examples.length];
    },
    steps: 6,
    challenge: "Why does N=9 (your vortex system) preserve all structure under octave doubling, but N=12 (standard chromatic) doesn't?",
    answer: "Because 9 is odd (gcd(2,9)=1) but 12 is even (gcd(2,12)=2). The factor of 2 in 12 means octave doubling is NOT invertible in chromatic space.",
  },
  // LESSON 3: LAW III
  {
    title: "Law III",
    subtitle: "Powers of 2 Are the Feeder Pole",
    content: `LAW: When N is a pure power of 2 (N = 2, 4, 8, 16, 32, ...), the ×2 map produces MAXIMUM feeders: F = N−1. Only the axis (N itself) survives as a fixed point.

This is the opposite extreme from Law II. Where odd numbers have zero feeders, powers of 2 have ALL feeders (except the axis).

Think of it this way: multiplying by 2 in a system of size 2^v is like left-shifting a binary number. After v shifts, everything becomes 0 (mod N) — which in our zero-free system means everything reaches the axis.

The 2-adic valuation v₂(N) measures "how much of a power of 2" N is. Higher v₂ → more feeders.`,
    getParams: (step) => {
      const examples = [
        { N: 4, k: 2, note: "N=4=2²: F=3 (only axis 4 survives)" },
        { N: 8, k: 2, note: "N=8=2³: F=7 (only axis 8 survives)" },
        { N: 16, k: 2, note: "N=16=2⁴: F=15 (all feeders!)" },
        { N: 32, k: 2, note: "N=32=2⁵: F=31 (extreme feeder pole)" },
        { N: 6, k: 2, note: "N=6=2¹×3: F=3 (mixed — 2-adic gradient)" },
        { N: 12, k: 2, note: "N=12=2²×3: F=9 (mixed)" },
      ];
      return examples[step % examples.length];
    },
    steps: 6,
    challenge: "In music: if 'powers of 2 = maximum diffusion', what does that mean for the number 64 (= 2⁶)?",
    answer: "64 is pure power-of-2: in a 64-class system, ×2 creates 63 feeders and only 1 fixed point. BUT as a frequency (C=64 Hz), its DIGITAL ROOT is 1 — placing it on the main 6-cycle in 9-class. The number's vortex class matters more than its absolute value.",
  },
  // LESSON 4: LAW IV
  {
    title: "Law IV",
    subtitle: "The 2-Adic Gradient",
    content: `LAW: Write N = 2^v × m (where m is odd). The cycle structure of ×2 on N mirrors the cycles of ×2 on m, but with v layers of feeder trees attached to each cycle node.

This is the Chinese Remainder Theorem at work: Z/NZ ≅ Z/2^v Z × Z/mZ. On the odd part (m), ×2 is a permutation (Law II). On the 2-power part (2^v), ×2 is nilpotent (Law III). The combined structure inherits cycles from m and feeders from 2^v.

As v increases, feeder trees grow deeper. As m grows, more cycles appear with richer structure. This creates a gradient: v pushes toward diffusion, m pushes toward resonance.

Maximum feeder depth = v (the 2-adic valuation of N). This is also provable.`,
    getParams: (step) => {
      const examples = [
        { N: 9, k: 2, note: "N=9=2⁰×9: v=0, pure cycles from m=9" },
        { N: 18, k: 2, note: "N=18=2¹×9: v=1, same cycles as 9 + depth-1 feeders" },
        { N: 36, k: 2, note: "N=36=2²×9: v=2, same cycles + depth-2 feeders" },
        { N: 72, k: 2, note: "N=72=2³×9: v=3, deeper feeder trees" },
        { N: 15, k: 2, note: "N=15=2⁰×15: v=0, pure cycles from m=15" },
        { N: 30, k: 2, note: "N=30=2¹×15: v=1, same cycles + feeders" },
      ];
      return examples[step % examples.length];
    },
    steps: 6,
    challenge: "N=36 and N=9 have the same odd part (m=9). Do they have the same NUMBER of cycles?",
    answer: "Yes! Both have cycles mirroring G(9,2): the 6-cycle, the 2-cycle, and the axis. N=36 just has more feeder nodes attached (because v₂(36)=2 adds depth-2 trees).",
  },
  // LESSON 5: LAW V
  {
    title: "Law V",
    subtitle: "GCD Determines Feeder Count",
    content: `LAW: For fixed N, two multipliers k₁ and k₂ with the same gcd to N produce the same number of feeders: if gcd(k₁,N) = gcd(k₂,N), then F(N,k₁) = F(N,k₂).

This is the strongest law. It says: the feeder count depends ONLY on gcd(k,N), not on which specific k you choose. The cycle lengths may differ, but the total number of feeder nodes is identical.

For N=12: gcd=1 (×5,×7,×11) → F=0. gcd=2 (×2,×10) → F=9. gcd=3 (×3,×9) → F=8. gcd=4 (×4,×8) → F=9. gcd=6 (×6) → F=11. gcd=12 (×12) → F=11.

Same gcd = same feeders. Always.`,
    getParams: (step) => {
      const examples = [
        { N: 12, k: 2, note: "×2: gcd=2 → F=9" },
        { N: 12, k: 10, note: "×10: gcd=2 → F=9 (same!)" },
        { N: 12, k: 3, note: "×3: gcd=3 → F=8" },
        { N: 12, k: 9, note: "×9: gcd=3 → F=8 (same!)" },
        { N: 12, k: 5, note: "×5: gcd=1 → F=0" },
        { N: 12, k: 7, note: "×7: gcd=1 → F=0 (same!)" },
      ];
      return examples[step % examples.length];
    },
    steps: 6,
    challenge: "Without computing: will ×4 and ×8 on N=12 have the same feeder count?",
    answer: "Yes! gcd(4,12)=4 and gcd(8,12)=4. Same gcd → same feeder count. Both give F=9.",
  },
  // LESSON 6: MUSICAL APPLICATION
  {
    title: "Application",
    subtitle: "Why Music Works (Mathematically)",
    content: `The Five Laws explain WHY certain musical operations create consonance and others create tension:

×2 (OCTAVE): In 9-class, gcd(2,9)=1 → pure permutation → octaves PRESERVE all structure. This is why octave equivalence feels 'natural' — it's a lossless operation.

×3 (FIFTH): In 9-class, gcd(3,9)=3 → contraction → fifths GENERATE new structure. Stacking fifths never returns to start — this is the Pythagorean comma, visible as feeders flowing into the axis.

×5 (THIRD): gcd(5,9)=1 → permutation, AND 5 is the multiplicative inverse of 2 mod 9. Major thirds literally UNDO what octaves do — they traverse the same cycle in reverse.

The three partitions (A={1,2,4,5,7,8}, B={3,6}, C={9}) correspond exactly to the prime families of Just Intonation: A = notes built from primes 2 and 5 (C, E). B = notes with one factor of 3 (G, B). C = notes with 3² (D, F#).

This is not numerology. It is provable number theory with measurable acoustic consequences.`,
    getParams: (step) => {
      const examples = [
        { N: 9, k: 2, note: "×2 (Octave): permutation — preserves structure" },
        { N: 9, k: 3, note: "×3 (Fifth): contraction — generates flow" },
        { N: 9, k: 5, note: "×5 (Third): inverse of ×2 — reverses octaves!" },
        { N: 9, k: 7, note: "×7 (7th harmonic): creates triadic grouping" },
        { N: 12, k: 7, note: "×7 on 12-class: perfect fifth = pure permutation" },
        { N: 12, k: 5, note: "×5 on 12-class: perfect fourth = pure permutation" },
      ];
      return examples[step % examples.length];
    },
    steps: 6,
    challenge: "In your own words: why does the circle of fifths 'almost' close but not quite?",
    answer: "Because gcd(3,12)=3 (not 1), so ×3 on 12-class is a contraction, not a permutation. Stacking fifths creates feeders — the circle 'leaks' through the Pythagorean comma. In 9-class, gcd(3,9)=3 shows the same thing: the fifth is fundamentally a non-closing operation.",
  },
];

// ═══════════════════════════════════════════════════════════════
// MAIN TUTORIAL APP
// ═══════════════════════════════════════════════════════════════
export default function FiveLawsTutorial() {
  const [lessonIdx, setLessonIdx] = useState(0);
  const [step, setStep] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sandbox, setSandbox] = useState({ N: 9, k: 2 });
  const [isSandbox, setIsSandbox] = useState(false);

  const lesson = LESSONS[lessonIdx];
  const params = useMemo(() => {
    if (isSandbox) return sandbox;
    if (lesson.steps) return lesson.getParams(step);
    return lesson.getParams();
  }, [lessonIdx, step, isSandbox, sandbox]);

  const vData = useMemo(() => vortex(params.N, params.k), [params.N, params.k]);
  const totalFeeders = vData.feed.length;
  const totalLoops = vData.cyc.filter(c => !(c.length === 1 && c[0] === params.N)).length;
  const g = gcd(params.k, params.N);
  const { v: v2val, m: oddPart } = v2(params.N);

  const nextStep = () => {
    if (lesson.steps && step < lesson.steps - 1) { setStep(step + 1); setShowAnswer(false); }
  };
  const prevStep = () => { if (step > 0) { setStep(step - 1); setShowAnswer(false); } };
  const nextLesson = () => { if (lessonIdx < LESSONS.length - 1) { setLessonIdx(lessonIdx + 1); setStep(0); setShowAnswer(false); setIsSandbox(false); } };
  const prevLesson = () => { if (lessonIdx > 0) { setLessonIdx(lessonIdx - 1); setStep(0); setShowAnswer(false); setIsSandbox(false); } };

  const panel = { background: "#11111e", borderRadius: 10, padding: "12px 16px", border: "1px solid #1e1e36" };

  return (
    <div style={{ minHeight: "100vh", background: "#08080e", color: "#e0e0f0", fontFamily: "'JetBrains Mono', monospace", padding: "12px 16px" }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 10 }}>
        <h1 style={{ fontSize: 20, color: "#ff3355", margin: 0, letterSpacing: 2 }}>THE FIVE LAWS</h1>
        <p style={{ fontSize: 10, color: "#555", margin: "2px 0" }}>An Interactive Tutorial on Loop-Feeder Decomposition in Modular Multiplication Graphs</p>
      </div>

      {/* Lesson navigation */}
      <div style={{ display: "flex", justifyContent: "center", gap: 3, marginBottom: 10, flexWrap: "wrap" }}>
        {LESSONS.map((l, i) => (
          <button key={i} onClick={() => { setLessonIdx(i); setStep(0); setShowAnswer(false); setIsSandbox(false); }}
            style={{ padding: "4px 12px", background: lessonIdx === i ? "#ff3355" : "#11111e",
              border: `1px solid ${lessonIdx === i ? "#ff3355" : "#2a2a3a"}`, color: lessonIdx === i ? "#fff" : "#666",
              borderRadius: 5, cursor: "pointer", fontSize: 9, fontFamily: "inherit", fontWeight: lessonIdx === i ? "bold" : "normal" }}>
            {l.title}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* Title */}
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <h2 style={{ fontSize: 22, color: "#ff3355", margin: 0 }}>{lesson.title}: {lesson.subtitle}</h2>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {/* Diagram */}
          <div style={{ flex: "0 0 auto", textAlign: "center" }}>
            <VortexDiag N={params.N} k={params.k} size={320} />
            <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
              N={params.N} ×{params.k} | <span style={{ color: "#ff3355" }}>L={totalLoops}</span> <span style={{ color: "#22cc66" }}>F={totalFeeders}</span> | gcd={g}
            </div>
            {params.note && <div style={{ fontSize: 10, color: "#ffd700", marginTop: 2 }}>{params.note}</div>}

            {/* Step nav */}
            {lesson.steps && !isSandbox && (
              <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 8 }}>
                <button onClick={prevStep} disabled={step === 0}
                  style={{ padding: "3px 12px", background: "#1a1a2e", border: "1px solid #333", color: step === 0 ? "#333" : "#888", borderRadius: 4, cursor: step === 0 ? "default" : "pointer", fontSize: 10, fontFamily: "inherit" }}>← Prev</button>
                <span style={{ fontSize: 10, color: "#555", padding: "3px 8px" }}>Example {step + 1}/{lesson.steps}</span>
                <button onClick={nextStep} disabled={step >= lesson.steps - 1}
                  style={{ padding: "3px 12px", background: "#1a1a2e", border: "1px solid #333", color: step >= lesson.steps - 1 ? "#333" : "#888", borderRadius: 4, cursor: step >= lesson.steps - 1 ? "default" : "pointer", fontSize: 10, fontFamily: "inherit" }}>Next →</button>
              </div>
            )}
          </div>

          {/* Content */}
          <div style={{ flex: "1 1 300px", display: "flex", flexDirection: "column", gap: 8 }}>
            {/* Lesson text */}
            <div style={{ ...panel }}>
              <div style={{ fontSize: 12, color: "#ccc", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{lesson.content}</div>
            </div>

            {/* Metrics */}
            <div style={{ ...panel, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 8, color: "#666", textTransform: "uppercase" }}>gcd(k,N)</div>
                <div style={{ fontSize: 22, fontWeight: "bold", color: g === 1 ? "#22cc66" : "#ff5566" }}>{g}</div>
                <div style={{ fontSize: 8, color: g === 1 ? "#22cc66" : "#ff5566" }}>{g === 1 ? "Coprime!" : "Not coprime"}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 8, color: "#666", textTransform: "uppercase" }}>2-adic v₂(N)</div>
                <div style={{ fontSize: 22, fontWeight: "bold", color: "#4488ff" }}>{v2val}</div>
                <div style={{ fontSize: 8, color: "#888" }}>N = 2^{v2val} × {oddPart}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 8, color: "#666", textTransform: "uppercase" }}>Euler φ(N)</div>
                <div style={{ fontSize: 22, fontWeight: "bold", color: "#aa55ff" }}>{(() => { let r = 0; for (let i = 1; i <= params.N; i++) if (gcd(i, params.N) === 1) r++; return r; })()}</div>
                <div style={{ fontSize: 8, color: "#888" }}>coprime count</div>
              </div>
            </div>

            {/* Challenge */}
            <div style={{ ...panel, background: "#0a1a0a", borderColor: "#224422" }}>
              <div style={{ fontSize: 9, color: "#22cc66", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Challenge</div>
              <div style={{ fontSize: 11, color: "#aaa", lineHeight: 1.6 }}>{lesson.challenge}</div>
              {!showAnswer ? (
                <button onClick={() => setShowAnswer(true)}
                  style={{ marginTop: 6, padding: "4px 14px", background: "#22cc66", border: "none", color: "#000", borderRadius: 4, cursor: "pointer", fontSize: 10, fontWeight: "bold", fontFamily: "inherit" }}>
                  REVEAL ANSWER
                </button>
              ) : (
                <div style={{ marginTop: 6, padding: "6px 10px", background: "#22cc6615", borderRadius: 4, border: "1px solid #224422" }}>
                  <div style={{ fontSize: 11, color: "#22cc66", lineHeight: 1.6 }}>{lesson.answer}</div>
                </div>
              )}
            </div>

            {/* Sandbox toggle */}
            <div style={{ ...panel }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: isSandbox ? 8 : 0 }}>
                <button onClick={() => setIsSandbox(!isSandbox)}
                  style={{ padding: "4px 14px", background: isSandbox ? "#4488ff" : "#1a1a2e", border: `1px solid ${isSandbox ? "#4488ff" : "#333"}`, color: isSandbox ? "#fff" : "#666", borderRadius: 4, cursor: "pointer", fontSize: 10, fontFamily: "inherit" }}>
                  {isSandbox ? "EXIT SANDBOX" : "🧪 TRY YOUR OWN"}
                </button>
                <span style={{ fontSize: 9, color: "#555" }}>Experiment with any N and k</span>
              </div>
              {isSandbox && (
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div>
                    <label style={{ fontSize: 9, color: "#666" }}>N: </label>
                    <input type="number" value={sandbox.N} min={2} max={200} onChange={e => setSandbox({ ...sandbox, N: Math.max(2, +e.target.value) })}
                      style={{ width: 50, background: "#1a1a2e", border: "1px solid #333", color: "#ff3355", padding: "2px 4px", borderRadius: 3, fontSize: 12, fontFamily: "inherit", textAlign: "center" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 9, color: "#666" }}>×k: </label>
                    <input type="number" value={sandbox.k} min={2} max={100} onChange={e => setSandbox({ ...sandbox, k: Math.max(2, +e.target.value) })}
                      style={{ width: 50, background: "#1a1a2e", border: "1px solid #333", color: "#4488ff", padding: "2px 4px", borderRadius: 3, fontSize: 12, fontFamily: "inherit", textAlign: "center" }} />
                  </div>
                  <div style={{ fontSize: 9, color: "#888" }}>
                    gcd({sandbox.k},{sandbox.N})={gcd(sandbox.k, sandbox.N)} → {gcd(sandbox.k, sandbox.N) === 1 ? "all loops" : "has feeders"}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom nav */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
          <button onClick={prevLesson} disabled={lessonIdx === 0}
            style={{ padding: "6px 20px", background: "#1a1a2e", border: "1px solid #333", color: lessonIdx === 0 ? "#333" : "#888", borderRadius: 5, cursor: lessonIdx === 0 ? "default" : "pointer", fontSize: 11, fontFamily: "inherit" }}>
            ← Previous Law
          </button>
          <span style={{ fontSize: 10, color: "#444", alignSelf: "center" }}>
            {lessonIdx + 1} / {LESSONS.length}
          </span>
          <button onClick={nextLesson} disabled={lessonIdx >= LESSONS.length - 1}
            style={{ padding: "6px 20px", background: lessonIdx >= LESSONS.length - 1 ? "#1a1a2e" : "#ff3355", border: `1px solid ${lessonIdx >= LESSONS.length - 1 ? "#333" : "#ff3355"}`, color: "#fff", borderRadius: 5, cursor: lessonIdx >= LESSONS.length - 1 ? "default" : "pointer", fontSize: 11, fontFamily: "inherit", fontWeight: "bold" }}>
            Next Law →
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: 12, fontSize: 8, color: "#222", letterSpacing: 1 }}>
          THE FIVE LAWS OF LOOP-FEEDER DECOMPOSITION · Ahmed Abouelnasr (Sacrifunk) · 2026
        </div>
      </div>
    </div>
  );
}

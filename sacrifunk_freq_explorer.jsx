import { useState, useMemo, useCallback, useRef } from "react";

// ═══════════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════════
const NOTES = ["C","C#","D","Eb","E","F","F#","G","Ab","A","Bb","B"];
const JI_RATIOS = [1, 16/15, 9/8, 6/5, 5/4, 4/3, 45/32, 3/2, 8/5, 5/3, 9/5, 15/8];
const JI_NAMES = ["1/1","16/15","9/8","6/5","5/4","4/3","45/32","3/2","8/5","5/3","9/5","15/8"];
const INTERVAL_NAMES = ["Unison","m2","M2","m3","M3","P4","Tritone","P5","m6","M6","m7","M7"];
const C_MAJOR = [0,2,4,5,7,9,11];
const C_MAJOR_SET = new Set(C_MAJOR);

// Digital roots at C=256 for integer-freq notes
const DR_MAP = {0:4, 2:9, 4:5, 6:9, 7:6, 11:3};
const PART_MAP = {1:"A",2:"A",3:"B",4:"A",5:"A",6:"B",7:"A",8:"A",9:"C"};

// Precomputed stability scores (5 generators on 12-class)
const STAB = (() => {
  const scores = {};
  const gens = [2,3,5,7,11];
  for (let pos = 1; pos <= 12; pos++) {
    let sc = 0;
    for (const g of gens) {
      const N = 12;
      const mod = x => { const r = x % N; return r === 0 ? N : r; };
      const mapping = {};
      for (let k = 1; k <= N; k++) mapping[k] = mod(k * g);
      const visited = new Set(), inCycle = new Set();
      for (let s = 1; s <= N; s++) {
        if (visited.has(s)) continue;
        const path = [], ps = new Set(); let cur = s;
        while (!visited.has(cur) && !ps.has(cur)) { path.push(cur); ps.add(cur); cur = mapping[cur]; }
        if (ps.has(cur)) { const idx = path.indexOf(cur); path.slice(idx).forEach(n => inCycle.add(n)); }
        path.forEach(n => visited.add(n));
      }
      if (inCycle.has(pos)) sc++;
    }
    scores[pos] = sc;
  }
  return scores;
})();

// Major scales for all 12 roots
function getMajorScale(rootSemi) {
  return [0,2,4,5,7,9,11].map(s => (s + rootSemi) % 12);
}

// Sethares roughness approximation for a dyad
function dyadRoughness(f1, f2) {
  let total = 0;
  for (let n = 1; n <= 8; n++) {
    for (let m = 1; m <= 8; m++) {
      const a1 = 1/n, a2 = 1/m;
      const freq1 = f1*n, freq2 = f2*m;
      const s = 0.24 / (0.021 * Math.min(freq1, freq2) + 19);
      const x = Math.abs(freq2 - freq1) * s;
      if (x > 0.001) total += a1 * a2 * (Math.exp(-3.5*x) - Math.exp(-5.75*x));
    }
  }
  return total;
}

// Audio
let audioCtx = null;
function getCtx() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); return audioCtx; }
function playTone(freq, dur = 0.7, delay = 0) {
  const ctx = getCtx(); const osc = ctx.createOscillator(); const g = ctx.createGain();
  const t = ctx.currentTime + delay;
  osc.type = "triangle"; osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.1, t+0.02);
  g.gain.exponentialRampToValueAtTime(0.001, t+dur);
  osc.connect(g); g.connect(ctx.destination); osc.start(t); osc.stop(t+dur+0.05);
}
function playChord(freqs, dur = 1.5) { freqs.forEach(f => playTone(f, dur, 0)); }

// ═══════════════════════════════════════════════════════════════
// CIRCLE OF FIFTHS MINI
// ═══════════════════════════════════════════════════════════════
function FifthsCircle({ rootSemi, scaleNotes, commonNotes, size = 190 }) {
  const cx = size/2, cy = size/2, r = size*0.38;
  const fifthOrder = [0,7,2,9,4,11,6,1,8,3,10,5]; // C G D A E B F# C# Ab Eb Bb F
  const scaleSet = new Set(scaleNotes);
  const commonSet = new Set(commonNotes);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{width:size}}>
      <circle cx={cx} cy={cy} r={r+4} fill="#0a0a14"/>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1a1a2a" strokeWidth="0.5"/>
      {fifthOrder.map((semi, i) => {
        const a = -Math.PI/2 + 2*Math.PI*i/12;
        const x = cx + r*Math.cos(a), y = cy + r*Math.sin(a);
        const inScale = scaleSet.has(semi);
        const inCommon = commonSet.has(semi);
        const isRoot = semi === rootSemi;
        const fill = isRoot ? "#ffd700" : inCommon ? "#22cc66" : inScale ? "#ff335580" : "#2a2a3a";
        return (
          <g key={semi}>
            {inScale && <circle cx={x} cy={y} r={13} fill="none" stroke={inCommon?"#22cc66":"#ff3355"} strokeWidth="1.5" opacity="0.4"/>}
            <circle cx={x} cy={y} r={10} fill={fill}/>
            <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fill={isRoot?"#000":"#fff"}
              fontSize="8" fontWeight="bold" fontFamily="'JetBrains Mono',monospace">{NOTES[semi]}</text>
          </g>
        );
      })}
      <text x={cx} y={size-2} textAnchor="middle" fill="#444" fontSize="7" fontFamily="'JetBrains Mono',monospace">
        Circle of Fifths
      </text>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// RELATIONSHIP BAR
// ═══════════════════════════════════════════════════════════════
function RelBar({ value, max, color, label }) {
  const pct = Math.round(100 * value / max);
  return (
    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
      <div style={{width:60,fontSize:9,color:"#888",textAlign:"right"}}>{label}</div>
      <div style={{flex:1,height:12,background:"#1a1a2a",borderRadius:6,overflow:"hidden"}}>
        <div style={{width:`${pct}%`,height:"100%",background:color,borderRadius:6,transition:"width 0.3s"}}/>
      </div>
      <div style={{width:30,fontSize:10,color,fontWeight:"bold",textAlign:"right"}}>{value}/{max}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DYAD DETAIL ROW
// ═══════════════════════════════════════════════════════════════
function DyadRow({ rootSemi, semi, octave, onPlay }) {
  const interval = ((semi - rootSemi) % 12 + 12) % 12;
  const note = NOTES[semi];
  const ratio = JI_RATIOS[interval];
  const jiName = JI_NAMES[interval];
  const intName = INTERVAL_NAMES[interval];
  const rootFreq = 256 * JI_RATIOS[rootSemi] * Math.pow(2, octave - 4);
  const jiFreq = rootFreq * ratio;
  let adjustedRatio = ratio;
  while (adjustedRatio < 1) adjustedRatio *= 2;
  while (adjustedRatio >= 2) adjustedRatio /= 2;
  const etFreq = rootFreq * Math.pow(2, interval/12);
  const cents = Math.round(1200 * Math.log2(ratio) * 10) / 10;
  const etCents = Math.round(interval * 100 * 10) / 10;
  const diff = Math.round((cents - etCents) * 10) / 10;

  const pos12 = semi + 1;
  const stab = STAB[pos12];
  const dr = DR_MAP[interval];
  const part = dr ? PART_MAP[dr] : "—";
  const inCMajor = C_MAJOR_SET.has(semi);

  // Roughness (simplified)
  const rough = dyadRoughness(rootFreq, jiFreq);
  const roughBar = Math.min(100, Math.round(rough * 500));

  const stabColor = stab >= 4 ? "#22cc66" : stab >= 3 ? "#ffd700" : "#ff5566";
  const partColor = part === "A" ? "#ff3355" : part === "B" ? "#22cc66" : part === "C" ? "#ffd700" : "#555";

  return (
    <tr style={{borderBottom:"1px solid #1a1a2a",cursor:"pointer"}}
      onClick={() => onPlay(rootFreq, jiFreq)}>
      <td style={{padding:"5px 6px",color:"#ff3355",fontWeight:"bold"}}>{intName}</td>
      <td style={{padding:"5px 6px",fontWeight:"bold",fontSize:13}}>{note}</td>
      <td style={{padding:"5px 6px",color:"#aaa",fontSize:10}}>{jiName}</td>
      <td style={{padding:"5px 6px",color:"#22cc66"}}>{jiFreq.toFixed(1)}</td>
      <td style={{padding:"5px 6px",color:"#4488ff"}}>{etFreq.toFixed(1)}</td>
      <td style={{padding:"5px 6px",color:Math.abs(diff)>10?"#ff5566":"#888",fontSize:10}}>
        {diff>0?"+":""}{diff}¢
      </td>
      <td style={{padding:"5px 2px"}}>
        <div style={{width:50,height:8,background:"#1a1a2a",borderRadius:4,overflow:"hidden"}}>
          <div style={{width:`${roughBar}%`,height:"100%",background:roughBar>60?"#ff5566":roughBar>30?"#ffd700":"#22cc66",borderRadius:4}}/>
        </div>
      </td>
      <td style={{padding:"5px 6px",textAlign:"center"}}>
        <span style={{color:stabColor,fontWeight:"bold",fontSize:11}}>{stab}</span>
      </td>
      <td style={{padding:"5px 6px",textAlign:"center"}}>
        <span style={{color:partColor,fontWeight:"bold",fontSize:11}}>{part}</span>
      </td>
      <td style={{padding:"5px 6px",textAlign:"center"}}>
        {inCMajor ? <span style={{color:"#22cc66"}}>✓</span> : <span style={{color:"#333"}}>·</span>}
      </td>
      <td style={{padding:"5px 6px",color:"#555",fontSize:9}}>▶</td>
    </tr>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════
export default function FreqExplorer() {
  const [rootSemi, setRootSemi] = useState(0);
  const [scaleType, setScaleType] = useState("major");
  const [octave, setOctave] = useState(4);
  const [compareRoot, setCompareRoot] = useState(7); // G

  const scalePatterns = {
    major: { semi: [0,2,4,5,7,9,11], name: "Major (Ionian)" },
    minor: { semi: [0,2,3,5,7,8,10], name: "Natural Minor" },
    harmMin: { semi: [0,2,3,5,7,8,11], name: "Harmonic Minor" },
    sacrifunk: { semi: [0,1,3,6,7,8,11], name: "Sacrifunk" },
    hyperPhr: { semi: [0,1,3,4,7,8,10], name: "Hyper Phrygian" },
    superPhr: { semi: [0,1,3,4,7,8,11], name: "Super Phrygian" },
    superHyper: { semi: [0,1,3,4,7,8,10,11], name: "Super Hyper Phr" },
    dblHarm: { semi: [0,1,4,5,7,8,11], name: "Double Harmonic" },
    hungMin: { semi: [0,2,3,6,7,8,11], name: "Hungarian Minor" },
    phrygian: { semi: [0,1,3,5,7,8,10], name: "Phrygian" },
    dorian: { semi: [0,2,3,5,7,9,10], name: "Dorian" },
    blues: { semi: [0,3,5,6,7,10], name: "Blues" },
    pentMin: { semi: [0,3,5,7,10], name: "Pentatonic Minor" },
  };

  const pattern = scalePatterns[scaleType];
  const scaleNotes = useMemo(() => pattern.semi.map(s => (s + rootSemi) % 12), [rootSemi, scaleType]);
  const scaleSet = useMemo(() => new Set(scaleNotes), [scaleNotes]);

  // Common notes with C major
  const commonWithC = useMemo(() => scaleNotes.filter(n => C_MAJOR_SET.has(n)), [scaleNotes]);

  // Common notes with compare root major
  const compareScale = useMemo(() => getMajorScale(compareRoot), [compareRoot]);
  const commonWithCompare = useMemo(() => {
    const cs = new Set(compareScale);
    return scaleNotes.filter(n => cs.has(n));
  }, [scaleNotes, compareScale]);

  // Stability average
  const stabAvg = useMemo(() => {
    const scores = scaleNotes.map(n => STAB[n+1]);
    return scores.reduce((a,b) => a+b, 0) / scores.length;
  }, [scaleNotes]);

  // Partition coverage
  const partitions = useMemo(() => {
    const parts = new Set();
    for (const s of pattern.semi) {
      const dr = DR_MAP[s];
      if (dr) parts.add(PART_MAP[dr]);
    }
    return parts;
  }, [scaleType]);

  // Root frequency
  const rootFreq = useMemo(() => {
    return 256 * JI_RATIOS[rootSemi] * Math.pow(2, octave - 4);
  }, [rootSemi, octave]);

  const handlePlayDyad = useCallback((f1, f2) => {
    playTone(f1, 1.2); playTone(f2, 1.2);
  }, []);

  const handlePlayScale = useCallback(() => {
    pattern.semi.forEach((s, i) => {
      const freq = rootFreq * JI_RATIOS[s];
      playTone(freq, 0.45, i * 0.3);
    });
    // Octave
    playTone(rootFreq * 2, 0.45, pattern.semi.length * 0.3);
  }, [rootFreq, scaleType]);

  const handlePlayTriad = useCallback((deg) => {
    const n = pattern.semi.length;
    const s0 = pattern.semi[deg % n], s1 = pattern.semi[(deg+2) % n], s2 = pattern.semi[(deg+4) % n];
    [s0,s1,s2].forEach(s => {
      let r = JI_RATIOS[s]; while(r < 1) r *= 2;
      playTone(rootFreq * r, 1.4);
    });
  }, [rootFreq, scaleType]);

  return (
    <div style={{minHeight:"100vh",background:"#08080e",color:"#e0e0f0",fontFamily:"'JetBrains Mono',monospace",padding:"12px 16px"}}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet"/>

      <div style={{textAlign:"center",marginBottom:10}}>
        <h1 style={{fontSize:20,color:"#ff3355",margin:0,letterSpacing:2}}>SACRIFUNK FREQUENCY EXPLORER</h1>
        <p style={{fontSize:9,color:"#555",margin:"2px 0"}}>JI 5-Limit · Vortex Classes · Spectral Roughness · Common Notes · Circle of Fifths</p>
      </div>

      <div style={{maxWidth:960,margin:"0 auto"}}>
        {/* Controls */}
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
          {/* Root */}
          <div style={{background:"#11111e",borderRadius:8,padding:"6px 10px",border:"1px solid #1e1e36",flex:"0 0 auto"}}>
            <div style={{fontSize:8,color:"#555",textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>Root</div>
            <div style={{display:"flex",gap:2,flexWrap:"wrap"}}>
              {NOTES.map((n,i) => (
                <button key={i} onClick={() => setRootSemi(i)} style={{padding:"2px 7px",
                  background:rootSemi===i?"#ffd700":"#0a0a14",border:`1px solid ${rootSemi===i?"#ffd700":"#2a2a3a"}`,
                  color:rootSemi===i?"#000":"#777",borderRadius:3,cursor:"pointer",fontSize:10,fontWeight:rootSemi===i?"bold":"normal",fontFamily:"inherit"}}>{n}</button>
              ))}
            </div>
          </div>
          {/* Scale */}
          <div style={{background:"#11111e",borderRadius:8,padding:"6px 10px",border:"1px solid #1e1e36",flex:"1 1 160px"}}>
            <div style={{fontSize:8,color:"#555",textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>Scale</div>
            <select value={scaleType} onChange={e => setScaleType(e.target.value)}
              style={{width:"100%",background:"#1a1a2e",border:"1px solid #333",color:"#ddd",padding:"3px 6px",borderRadius:4,fontSize:11,fontFamily:"inherit"}}>
              {Object.entries(scalePatterns).map(([k,v]) => <option key={k} value={k}>{v.name}</option>)}
            </select>
          </div>
          {/* Octave */}
          <div style={{background:"#11111e",borderRadius:8,padding:"6px 10px",border:"1px solid #1e1e36",flex:"0 0 auto"}}>
            <div style={{fontSize:8,color:"#555",textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>Octave</div>
            <div style={{display:"flex",gap:2}}>
              {[2,3,4,5].map(o => (
                <button key={o} onClick={() => setOctave(o)} style={{padding:"2px 8px",
                  background:octave===o?"#4488ff":"#0a0a14",border:`1px solid ${octave===o?"#4488ff":"#2a2a3a"}`,
                  color:octave===o?"#fff":"#666",borderRadius:3,cursor:"pointer",fontSize:10,fontFamily:"inherit"}}>{o}</button>
              ))}
            </div>
          </div>
          {/* Compare */}
          <div style={{background:"#11111e",borderRadius:8,padding:"6px 10px",border:"1px solid #1e1e36",flex:"0 0 auto"}}>
            <div style={{fontSize:8,color:"#555",textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>Compare to</div>
            <select value={compareRoot} onChange={e => setCompareRoot(Number(e.target.value))}
              style={{background:"#1a1a2e",border:"1px solid #333",color:"#ddd",padding:"3px 6px",borderRadius:4,fontSize:11,fontFamily:"inherit"}}>
              {NOTES.map((n,i) => <option key={i} value={i}>{n} major</option>)}
            </select>
          </div>
          {/* Play */}
          <div style={{background:"#11111e",borderRadius:8,padding:"6px 10px",border:"1px solid #1e1e36",flex:"0 0 auto",display:"flex",alignItems:"flex-end"}}>
            <button onClick={handlePlayScale} style={{padding:"4px 14px",background:"#ff3355",border:"none",color:"#fff",
              borderRadius:5,cursor:"pointer",fontSize:10,fontFamily:"inherit",letterSpacing:1}}>▶ PLAY SCALE</button>
          </div>
        </div>

        {/* Dashboard row */}
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
          {/* Summary cards */}
          <div style={{flex:"1 1 240px",display:"flex",flexDirection:"column",gap:6}}>
            {/* Root info */}
            <div style={{background:"#11111e",borderRadius:8,padding:"8px 12px",border:"1px solid #1e1e36"}}>
              <div style={{fontSize:20,fontWeight:"bold",color:"#ffd700"}}>{NOTES[rootSemi]} {pattern.name}</div>
              <div style={{fontSize:11,color:"#888"}}>Root: {rootFreq.toFixed(2)} Hz (JI, Oct {octave})</div>
              <div style={{fontSize:10,color:"#666",marginTop:2}}>
                Notes: {scaleNotes.map(n => NOTES[n]).join(" · ")}
              </div>
            </div>

            {/* Relationship bars */}
            <div style={{background:"#11111e",borderRadius:8,padding:"8px 12px",border:"1px solid #1e1e36"}}>
              <div style={{fontSize:8,color:"#555",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Relationships</div>
              <RelBar value={commonWithC.length} max={7} color="#22cc66" label="vs C maj"/>
              <RelBar value={commonWithCompare.length} max={7} color="#4488ff" label={`vs ${NOTES[compareRoot]} maj`}/>
              <RelBar value={Math.round(stabAvg*10)/10} max={5} color={stabAvg>=3.7?"#22cc66":stabAvg>=3.5?"#ffd700":"#ff5566"} label="Stability"/>
              <div style={{fontSize:9,color:"#555",marginTop:4}}>
                Common with C: {commonWithC.map(n=>NOTES[n]).join(", ")||"none"}<br/>
                Common with {NOTES[compareRoot]}: {commonWithCompare.map(n=>NOTES[n]).join(", ")||"none"}
              </div>
            </div>

            {/* Partitions */}
            <div style={{background:"#11111e",borderRadius:8,padding:"8px 12px",border:"1px solid #1e1e36"}}>
              <div style={{fontSize:8,color:"#555",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>9-Class Vortex Partitions</div>
              <div style={{display:"flex",gap:8}}>
                {["A","B","C"].map(part => {
                  const active = partitions.has(part);
                  const colors = {A:"#ff3355",B:"#22cc66",C:"#ffd700"};
                  const labels = {A:"Main (C/E)",B:"Fifth (G/B)",C:"Axis (D/F#)"};
                  return (
                    <div key={part} style={{flex:1,padding:"4px 6px",borderRadius:4,textAlign:"center",
                      background:active?colors[part]+"15":"#0a0a14",border:`1px solid ${active?colors[part]:"#222"}`}}>
                      <div style={{fontSize:16,fontWeight:"bold",color:active?colors[part]:"#333"}}>{part}</div>
                      <div style={{fontSize:7,color:active?"#888":"#333"}}>{labels[part]}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Circle of fifths */}
          <div style={{flex:"0 0 auto",background:"#11111e",borderRadius:8,padding:"4px",border:"1px solid #1e1e36",display:"flex",alignItems:"center"}}>
            <FifthsCircle rootSemi={rootSemi} scaleNotes={scaleNotes} commonNotes={commonWithC} size={195}/>
          </div>

          {/* Triads */}
          <div style={{flex:"1 1 200px",background:"#11111e",borderRadius:8,padding:"8px 12px",border:"1px solid #1e1e36"}}>
            <div style={{fontSize:8,color:"#555",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Diatonic Triads (click to play)</div>
            <div style={{display:"flex",flexDirection:"column",gap:3}}>
              {pattern.semi.slice(0, Math.min(7, pattern.semi.length)).map((_, deg) => {
                const n = pattern.semi.length;
                const s0 = (pattern.semi[deg%n]+rootSemi)%12;
                const s1 = (pattern.semi[(deg+2)%n]+rootSemi)%12;
                const s2 = (pattern.semi[(deg+4)%n]+rootSemi)%12;
                const hasF = [s0,s1,s2].some(x => x === 6);
                const notes = [NOTES[s0],NOTES[s1],NOTES[s2]];
                return (
                  <div key={deg} onClick={() => handlePlayTriad(deg)}
                    style={{display:"flex",alignItems:"center",gap:6,padding:"3px 6px",borderRadius:4,cursor:"pointer",
                      background:hasF?"#1a0a0a":"#0a0a14",border:`1px solid ${hasF?"#332222":"#1a1a2a"}`}}>
                    <span style={{width:16,fontSize:10,color:"#666"}}>{deg+1}</span>
                    <span style={{flex:1,fontSize:11,fontWeight:"bold",color:hasF?"#ff5566":"#22cc66"}}>
                      {notes.join("-")}
                    </span>
                    <span style={{fontSize:8,color:"#555"}}>{hasF?"❌":"✅"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Interval detail table */}
        <div style={{background:"#11111e",borderRadius:8,padding:"8px 12px",border:"1px solid #1e1e36",overflowX:"auto"}}>
          <div style={{fontSize:8,color:"#555",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>
            Interval Detail — Click any row to hear the dyad
          </div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead>
              <tr style={{borderBottom:"1px solid #2a2a3a"}}>
                {["Interval","Note","JI Ratio","JI Hz","ET Hz","Δ cents","Rough","Stab","Part","C maj","▶"].map(h => (
                  <th key={h} style={{padding:"3px 6px",color:"#666",fontWeight:"normal",textAlign:"left",fontSize:9}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pattern.semi.map(s => {
                const absSemi = (s + rootSemi) % 12;
                return <DyadRow key={s} rootSemi={rootSemi} semi={absSemi} octave={octave} onPlay={handlePlayDyad}/>;
              })}
            </tbody>
          </table>
        </div>

        <div style={{textAlign:"center",marginTop:10,fontSize:8,color:"#2a2a3a",letterSpacing:1}}>
          SACRIFUNK FREQUENCY EXPLORER · JI 5-Limit from C-Doubling · Vortex × Spectral Coherence · 2026
        </div>
      </div>
    </div>
  );
}

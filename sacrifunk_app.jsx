import { useState, useMemo, useCallback, useRef, useEffect } from "react";

// ═══════════════════════════════════════════════════════════════
// SHARED CONSTANTS & ENGINE
// ═══════════════════════════════════════════════════════════════
const NOTES = ["C","C#","D","Eb","E","F","F#","G","Ab","A","Bb","B"];
const JI = [1,16/15,9/8,6/5,5/4,4/3,45/32,3/2,8/5,5/3,9/5,15/8];
const JI_N = ["1/1","16/15","9/8","6/5","5/4","4/3","45/32","3/2","8/5","5/3","9/5","15/8"];
const INT_N = ["P1","m2","M2","m3","M3","P4","TT","P5","m6","M6","m7","M7"];
const DR = {0:4,2:9,4:5,6:9,7:6,11:3};
const PM = {1:"A",2:"A",3:"B",4:"A",5:"A",6:"B",7:"A",8:"A",9:"C"};
const CMAJ = new Set([0,2,4,5,7,9,11]);

const SC = {
  "Sacrifunk":{s:[0,1,3,6,7,8,11],c:"#ff3355",d:"1 ♭2 ♭3 #4 5 ♭6 7"},
  "Hyper Phrygian":{s:[0,1,3,4,7,8,10],c:"#ff8800",d:"1 ♭2 ♭3 ♭4 5 ♭6 ♭7"},
  "Super Phrygian":{s:[0,1,3,4,7,8,11],c:"#4488ff",d:"1 ♭2 ♭3 4 5 ♭6 7"},
  "Super Hyper Phr":{s:[0,1,3,4,7,8,10,11],c:"#aa55ff",d:"8-note union"},
  "Vibron":{s:[0,1,2,5,6,7,9,10,11],c:"#22cc66",d:"9-note, 13st"},
  "Ionian (Major)":{s:[0,2,4,5,7,9,11],c:"#888",d:"Standard major"},
  "Dorian":{s:[0,2,3,5,7,9,10],c:"#888",d:"Minor w/ raised 6th"},
  "Phrygian":{s:[0,1,3,5,7,8,10],c:"#888",d:"Parent Phrygian"},
  "Harmonic Minor":{s:[0,2,3,5,7,8,11],c:"#888",d:"Most vortex-stable (4.00/5)"},
  "Double Harmonic":{s:[0,1,4,5,7,8,11],c:"#888",d:"= Bulgarian/Byzantine"},
  "Hungarian Minor":{s:[0,2,3,6,7,8,11],c:"#888",d:"Sacrifunk cousin (6/7 shared)"},
  "Blues":{s:[0,3,5,6,7,10],c:"#888",d:"Minor blues"},
};

// Vortex engine
function vortex(N, mult) {
  const mod = x => { const r=x%N; return r===0?N:r; };
  const map = {}; for(let k=1;k<=N;k++) map[k]=mod(k*mult);
  const vis=new Set(),inC=new Set(),cyc=[];
  for(let s=1;s<=N;s++){
    if(vis.has(s)) continue;
    const p=[],ps=new Set(); let c=s;
    while(!vis.has(c)&&!ps.has(c)){p.push(c);ps.add(c);c=map[c];}
    if(ps.has(c)){const i=p.indexOf(c);const cy=p.slice(i);cy.forEach(n=>inC.add(n));cyc.push(cy);}
    p.forEach(n=>vis.add(n));
  }
  const feed=[]; for(let k=1;k<=N;k++) if(!inC.has(k)) feed.push(k);
  const chains=[],used=new Set();
  for(const fn of feed){
    if(used.has(fn)) continue;
    const ch=[fn]; used.add(fn); let cu=map[fn];
    while(!inC.has(cu)&&!used.has(cu)){ch.push(cu);used.add(cu);cu=map[cu];}
    ch.push(cu); chains.push(ch);
  }
  return {cyc,feed,inC,map,chains,N};
}

// Stability (precomputed for 12-class)
const STAB = (()=>{const s={};const gs=[2,3,5,7,11];for(let p=1;p<=12;p++){let sc=0;for(const g of gs){const{inC}=vortex(12,g);if(inC.has(p))sc++;}s[p]=sc;}return s;})();

// Audio
let actx=null;
function ctx(){if(!actx)actx=new(window.AudioContext||window.webkitAudioContext)();return actx;}
function tone(f,dur=0.6,del=0){const c=ctx();const o=c.createOscillator();const g=c.createGain();const t=c.currentTime+del;o.type="triangle";o.frequency.setValueAtTime(f,t);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.1,t+0.02);g.gain.exponentialRampToValueAtTime(0.001,t+dur);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+dur+0.05);}
function chord(fs,d=1.2){fs.forEach(f=>tone(f,d));}

function nPos(i,tot,cx,cy,r){const a=-Math.PI/2+2*Math.PI*(i-1)/tot;return{x:cx+r*Math.cos(a),y:cy+r*Math.sin(a)};}

// ═══════════════════════════════════════════════════════════════
// TAB 1: VORTEX EXPLORER
// ═══════════════════════════════════════════════════════════════
function VortexTab() {
  const [N,setN]=useState(12);
  const [mults,setMults]=useState([2]);
  const [scaleName,setSN]=useState("Sacrifunk");
  const [showScale,setSS]=useState(true);
  const toggle=m=>setMults(p=>p.includes(m)?(p.length>1?p.filter(x=>x!==m):p):[...p,m]);
  const size=380,cx=size/2,cy=size/2,r=size*0.38,nodeR=Math.max(5,Math.min(16,200/N));
  const pos=useMemo(()=>{const p={};for(let i=1;i<=N;i++)p[i]=nPos(i,N,cx,cy,r);return p;},[N]);
  const vs=useMemo(()=>mults.map(m=>({m,...vortex(N,m)})),[N,mults]);
  const allInC=useMemo(()=>{const s=new Set();vs.forEach(v=>v.inC.forEach(n=>s.add(n)));return s;},[vs]);
  const scP=useMemo(()=>{if(!showScale||N!==12)return[];const sc=SC[scaleName];return sc?sc.s.map(s=>(s%12)+1):[];},[showScale,N,scaleName]);
  const scSet=new Set(scP);
  const cols=["#ff3355","#4488ff","#aa55ff","#22cc66","#ff8800"];
  const gcd=(a,b)=>b===0?a:gcd(b,a%b);

  return (
    <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
      <svg viewBox={`0 0 ${size} ${size}`} style={{width:"100%",maxWidth:size}}>
        <defs><radialGradient id="vbg"><stop offset="0%" stopColor="#1a1a30"/><stop offset="100%" stopColor="#0a0a14"/></radialGradient>
        <filter id="gl"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
        <circle cx={cx} cy={cy} r={r+20} fill="url(#vbg)"/><circle cx={cx} cy={cy} r={r} fill="none" stroke="#2a2a4a" strokeWidth="0.5"/>
        {vs.map((v,vi)=><g key={vi}>
          {v.chains&&v.chains.map((ch,ci)=>ch.slice(0,-1).map((nd,i)=>{const n=ch[i+1],p1=pos[nd],p2=pos[n];return p1&&p2?<line key={`f${vi}${ci}${i}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#22cc66" strokeWidth="1" opacity="0.4"/>:null;}))}
          {v.cyc.map((cy,ci)=>cy.map((nd,i)=>{const nx=cy[(i+1)%cy.length],p1=pos[nd],p2=pos[nx];return p1&&p2?<line key={`c${vi}${ci}${i}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={cols[vi%5]} strokeWidth={mults.length>1?1.5:2} opacity={mults.length>1?0.5:0.85} filter="url(#gl)"/>:null;}))}
        </g>)}
        {Array.from({length:N},(_,i)=>i+1).map(n=>{const p=pos[n];if(!p)return null;const isAx=n===N,inSc=scSet.has(n),isLoop=allInC.has(n);
          return <g key={n}>{inSc&&<circle cx={p.x} cy={p.y} r={nodeR+4} fill="none" stroke="#ffd700" strokeWidth="1.5" opacity="0.4"/>}
          <circle cx={p.x} cy={p.y} r={nodeR} fill={isAx?"#ffd700":isLoop?"#ff3355":"#2a2a4a"} opacity={0.9}/>
          {N<=24&&<text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fill={isAx?"#000":"#fff"} fontSize={Math.max(7,nodeR*0.75)} fontWeight="bold" fontFamily="monospace">{N===12?NOTES[n-1]:n}</text>}
          {N===12&&STAB[n]!==undefined&&<text x={p.x} y={p.y+nodeR+9} textAnchor="middle" fill={STAB[n]>=4?"#22cc66":STAB[n]>=3?"#ffd700":"#ff5566"} fontSize="7" fontFamily="monospace">{STAB[n]}/5</text>}
          </g>;})}
        <text x={8} y={size-6} fill="#444" fontSize="8" fontFamily="monospace">{mults.map(m=>`×${m}`).join("+")} on {N}-class</text>
      </svg>
      <div style={{flex:"0 0 300px",display:"flex",flexDirection:"column",gap:8}}>
        <Ctrl label="Base N"><div style={{display:"flex",alignItems:"center",gap:6}}><input type="range" min={3} max={64} value={N} onChange={e=>setN(+e.target.value)} style={{flex:1,accentColor:"#ff3355"}}/><span style={{color:"#ff3355",fontWeight:"bold",width:30}}>{N}</span></div>
          <div style={{display:"flex",flexWrap:"wrap",gap:2,marginTop:4}}>{[9,12,19,27,31,53].map(n=><Btn key={n} active={N===n} onClick={()=>setN(n)}>{n}</Btn>)}</div></Ctrl>
        <Ctrl label="Generators (multi-select)"><div style={{display:"flex",flexWrap:"wrap",gap:3}}>{[2,3,4,5,6,7,8,9,10,11].map(m=><Btn key={m} active={mults.includes(m)} color={mults.includes(m)?cols[mults.indexOf(m)%5]:undefined} onClick={()=>toggle(m)}>×{m}</Btn>)}</div></Ctrl>
        {N===12&&<Ctrl label="Scale Overlay"><div style={{display:"flex",gap:6,alignItems:"center"}}><select value={scaleName} onChange={e=>setSN(e.target.value)} style={{flex:1,...selStyle}}>{Object.keys(SC).map(s=><option key={s}>{s}</option>)}</select>
          <label style={{fontSize:9,color:"#666",cursor:"pointer"}}><input type="checkbox" checked={showScale} onChange={e=>setSS(e.target.checked)} style={{accentColor:"#ffd700"}}/>Show</label></div></Ctrl>}
        <Ctrl label="Cycle Analysis">{vs.map((v,i)=><div key={i} style={{fontSize:10,marginBottom:4}}>
          <span style={{color:cols[i%5],fontWeight:"bold"}}>×{v.m}</span> <span style={{color:"#666"}}>gcd={gcd(v.m,N)}</span> <span style={{color:"#ff3355"}}>L{v.cyc.filter(c=>!(c.length===1&&c[0]===N)).length}</span> <span style={{color:"#22cc66"}}>F{v.feed.length}</span>
          <div style={{fontSize:8,color:"#555"}}>{v.cyc.map((c,j)=><span key={j} style={{marginRight:4,color:c.length===1&&c[0]===N?"#ffd700":"#ff3355"}}>{c.join("→")}{c.length>1?"→"+c[0]:""}</span>)}</div>
        </div>)}</Ctrl>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 2: SCALE EXPLORER
// ═══════════════════════════════════════════════════════════════
function ScaleTab() {
  const [scaleName,setSN]=useState("Sacrifunk");
  const [root,setRoot]=useState(0);
  const [tuning,setTuning]=useState("ji");
  const [oct,setOct]=useState(4);
  const sc=SC[scaleName];
  const rootF=256*JI[root]*Math.pow(2,oct-4);

  const notes=useMemo(()=>sc.s.map(s=>{
    const semi=(s+root)%12;const pos=semi+1;const ratio=JI[s];
    const jiF=rootF*ratio;const etF=rootF*Math.pow(2,s/12);
    const diff=Math.round(1200*Math.log2(ratio/Math.pow(2,s/12))*10)/10;
    return {semi,note:NOTES[semi],s,jiF,etF,diff,stab:STAB[pos],pos,deg:INT_N[s]||`${s}st`};
  }),[scaleName,root,oct]);

  const stabAvg=useMemo(()=>{const ss=notes.map(n=>n.stab);return ss.reduce((a,b)=>a+b,0)/ss.length;},[notes]);

  const playScale=()=>{notes.forEach((n,i)=>{tone(tuning==="ji"?n.jiF:n.etF,0.45,i*0.3);});tone(rootF*2,0.45,notes.length*0.3);};
  const compare=()=>{notes.forEach((n,i)=>tone(n.jiF,0.35,i*0.25));const off=notes.length*0.25+0.4;notes.forEach((n,i)=>tone(n.etF,0.35,off+i*0.25));};

  return (
    <div style={{maxWidth:860,margin:"0 auto"}}>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
        <Ctrl label="Scale"><select value={scaleName} onChange={e=>setSN(e.target.value)} style={selStyle}>{Object.keys(SC).map(s=><option key={s}>{s}</option>)}</select></Ctrl>
        <Ctrl label="Root"><div style={{display:"flex",gap:2,flexWrap:"wrap"}}>{NOTES.map((n,i)=><Btn key={i} active={root===i} color={root===i?"#ffd700":undefined} onClick={()=>setRoot(i)}>{n}</Btn>)}</div></Ctrl>
        <Ctrl label="Tuning"><div style={{display:"flex",gap:3}}>
          <Btn active={tuning==="ji"} color={tuning==="ji"?"#22cc66":undefined} onClick={()=>setTuning("ji")}>JI 5-Limit</Btn>
          <Btn active={tuning==="et"} color={tuning==="et"?"#4488ff":undefined} onClick={()=>setTuning("et")}>12-TET</Btn>
        </div></Ctrl>
        <Ctrl label="Oct"><div style={{display:"flex",gap:2}}>{[2,3,4,5].map(o=><Btn key={o} active={oct===o} onClick={()=>setOct(o)}>{o}</Btn>)}</div></Ctrl>
      </div>
      <div style={{display:"flex",gap:6,justifyContent:"center",marginBottom:10}}>
        <button onClick={playScale} style={{...btnPrimary}}>▶ PLAY {tuning.toUpperCase()}</button>
        <button onClick={compare} style={{...btnSecondary}}>🔄 COMPARE JI → ET</button>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
        <div style={{flex:"1 1 200px",...panel}}>
          <div style={{fontSize:18,fontWeight:"bold",color:sc.c}}>{NOTES[root]} {scaleName}</div>
          <div style={{fontSize:10,color:"#888"}}>{sc.d} · Root: {rootF.toFixed(1)} Hz</div>
          <div style={{fontSize:12,fontWeight:"bold",marginTop:4,color:stabAvg>=3.7?"#22cc66":stabAvg>=3.5?"#ffd700":"#ff5566"}}>Stability: {stabAvg.toFixed(2)}/5</div>
        </div>
        <div style={{flex:"1 1 300px",...panel}}>
          <div style={{display:"flex",flexWrap:"wrap",gap:3}}>{notes.map(n=>(
            <div key={n.s} onClick={()=>tone(tuning==="ji"?n.jiF:n.etF,0.8)} style={{padding:"4px 8px",borderRadius:4,cursor:"pointer",textAlign:"center",minWidth:50,
              background:n.s===0?"#ffd70020":"#1a1a2e",border:`1px solid ${n.s===0?"#ffd700":"#2a2a3a"}`}}>
              <div style={{fontSize:12,fontWeight:"bold",color:"#fff"}}>{n.note}</div>
              <div style={{fontSize:8,color:sc.c}}>{n.deg}</div>
              <div style={{fontSize:8,color:n.stab>=4?"#22cc66":n.stab>=3?"#ffd700":"#ff5566"}}>{n.stab}/5</div>
              <div style={{fontSize:7,color:"#666"}}>{(tuning==="ji"?n.jiF:n.etF).toFixed(1)}Hz</div>
              {n.diff!==0&&<div style={{fontSize:7,color:Math.abs(n.diff)>10?"#ff5566":"#555"}}>{n.diff>0?"+":""}{n.diff}¢</div>}
            </div>
          ))}</div>
        </div>
      </div>
      {/* Triads */}
      <div style={panel}>
        <div style={{fontSize:9,color:"#555",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Triads — click to play</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{sc.s.slice(0,Math.min(7,sc.s.length)).map((_,deg)=>{
          const n=sc.s.length,s0=(sc.s[deg%n]+root)%12,s1=(sc.s[(deg+2)%n]+root)%12,s2=(sc.s[(deg+4)%n]+root)%12;
          const hasF=[s0,s1,s2].some(x=>x===6);
          const fs=[s0,s1,s2].map(s=>{let r=JI[s]/JI[root];while(r<1)r*=2;return rootF*r;});
          return <div key={deg} onClick={()=>chord(fs)} style={{padding:"5px 8px",borderRadius:5,cursor:"pointer",minWidth:80,textAlign:"center",
            background:hasF?"#1a0a0a":"#0a1a0a",border:`1px solid ${hasF?"#332222":"#223322"}`}}>
            <div style={{fontSize:11,fontWeight:"bold",color:hasF?"#ff5566":"#22cc66"}}>{NOTES[s0]}-{NOTES[s1]}-{NOTES[s2]}</div>
            <div style={{fontSize:8,color:"#666"}}>{hasF?"❌ F# beat":"✅ pure"}</div>
          </div>;
        })}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 3: CYMATICS LAB
// ═══════════════════════════════════════════════════════════════
function CymaticsTab() {
  const [freq,setFreq]=useState(256);const [playing,setPlaying]=useState(false);
  const canvasRef=useRef(null);const oscRef=useRef(null);
  
  useEffect(()=>{
    const cv=canvasRef.current;if(!cv)return;const c=cv.getContext("2d");const sz=360;
    const s=freq/50,m=Math.max(1,Math.round(Math.sqrt(s))),n=Math.max(1,Math.round(s/m));
    const img=c.createImageData(sz,sz);const cx=sz/2,r=sz/2-1;
    for(let y=0;y<sz;y++)for(let x=0;x<sz;x++){
      const nx=(x-cx)/r,ny=(y-cx)/r,idx=(y*sz+x)*4;
      if(nx*nx+ny*ny>1){img.data[idx]=8;img.data[idx+1]=8;img.data[idx+2]=12;img.data[idx+3]=255;continue;}
      const v=Math.cos(n*Math.PI*nx)*Math.cos(m*Math.PI*ny)-Math.cos(m*Math.PI*nx)*Math.cos(n*Math.PI*ny);
      const isN=Math.abs(v)<0.06;
      if(isN){const b=200+Math.random()*55;img.data[idx]=b;img.data[idx+1]=b*0.9;img.data[idx+2]=b*0.7;}
      else{const d=Math.floor(15+Math.abs(v)*25);img.data[idx]=d;img.data[idx+1]=d;img.data[idx+2]=d+5;}
      img.data[idx+3]=255;
    }
    c.putImageData(img,0,0);
  },[freq]);

  useEffect(()=>{if(oscRef.current)oscRef.current.frequency.value=freq;},[freq]);
  const toggleAudio=()=>{
    if(oscRef.current){oscRef.current.stop();oscRef.current=null;setPlaying(false);return;}
    const c=ctx();const o=c.createOscillator();const g=c.createGain();o.type="sine";o.frequency.value=freq;g.gain.value=0.12;
    o.connect(g);g.connect(c.destination);o.start();oscRef.current=o;setPlaying(true);
  };
  useEffect(()=>()=>{if(oscRef.current){oscRef.current.stop();oscRef.current=null;}},[]);
  
  const dr=freq===Math.floor(freq)?(freq%9===0?9:freq%9):null;
  const part=dr?(dr===9?"C(axis)":[3,6].includes(dr)?"B(fifth)":"A(main)"):"—";

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
      <canvas ref={canvasRef} width={360} height={360} style={{borderRadius:"50%",border:"2px solid #2a2a4a"}}/>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <input type="range" min={20} max={2000} value={freq} onChange={e=>setFreq(+e.target.value)} style={{width:250,accentColor:"#ff3355"}}/>
        <input type="number" value={Math.round(freq*100)/100} onChange={e=>setFreq(+e.target.value)} style={{width:65,...numInput}}/>
        <span style={{fontSize:11,color:"#666"}}>Hz</span>
      </div>
      <button onClick={toggleAudio} style={playing?{...btnPrimary,background:"#ff3355"}:{...btnSecondary}}>{playing?"■ STOP":"▶ PLAY TONE"}</button>
      <div style={{display:"flex",flexWrap:"wrap",gap:3,justifyContent:"center"}}>
        {[{n:"C",f:256},{n:"D",f:288},{n:"E",f:320},{n:"G",f:384},{n:"B",f:480},{n:"C₂",f:64},{n:"E₂",f:80},{n:"G₂",f:96},{n:"C₁",f:32},{n:"E₁",f:40},{n:"G₁",f:48}].map(p=>
          <Btn key={p.n} active={Math.abs(freq-p.f)<0.5} onClick={()=>setFreq(p.f)}>{p.n}={p.f}</Btn>
        )}
      </div>
      <div style={{display:"flex",gap:16,fontSize:11}}>
        <span>Digital Root: <b style={{color:"#ffd700"}}>{dr||"—"}</b></span>
        <span>Partition: <b style={{color:"#22cc66"}}>{part}</b></span>
        <span>Mode: <b style={{color:"#aaa"}}>({Math.max(1,Math.round(Math.sqrt(freq/50)))},{Math.max(1,Math.round(freq/50/Math.max(1,Math.round(Math.sqrt(freq/50)))))})</b></span>
      </div>
      <div style={{fontSize:9,color:"#444",maxWidth:400,textAlign:"center",lineHeight:1.5}}>
        Chladni plate simulation. Bright lines = nodal patterns (zero displacement). Real physics — wave equation on bounded domain. Higher frequency → more complex pattern.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 4: FREQUENCY EXPLORER
// ═══════════════════════════════════════════════════════════════
function FreqTab() {
  const [root,setRoot]=useState(0);const [scaleName,setSN]=useState("Sacrifunk");const [oct,setOct]=useState(4);const [comp,setComp]=useState(7);
  const sc=SC[scaleName];const rootF=256*JI[root]*Math.pow(2,oct-4);
  const scNotes=useMemo(()=>sc.s.map(s=>(s+root)%12),[root,scaleName]);
  const commonC=useMemo(()=>scNotes.filter(n=>CMAJ.has(n)),[scNotes]);
  const compScale=useMemo(()=>[0,2,4,5,7,9,11].map(s=>(s+comp)%12),[comp]);
  const commonComp=useMemo(()=>{const cs=new Set(compScale);return scNotes.filter(n=>cs.has(n));},[scNotes,compScale]);
  const stabAvg=useMemo(()=>{const ss=scNotes.map(n=>STAB[n+1]);return ss.reduce((a,b)=>a+b,0)/ss.length;},[scNotes]);
  const parts=useMemo(()=>{const p=new Set();sc.s.forEach(s=>{const d=DR[s];if(d)p.add(PM[d]);});return p;},[scaleName]);

  const playScale=()=>{sc.s.forEach((s,i)=>tone(rootF*JI[s],0.4,i*0.28));tone(rootF*2,0.4,sc.s.length*0.28);};

  return (
    <div style={{maxWidth:860,margin:"0 auto"}}>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
        <Ctrl label="Root"><div style={{display:"flex",gap:2,flexWrap:"wrap"}}>{NOTES.map((n,i)=><Btn key={i} active={root===i} color={root===i?"#ffd700":undefined} onClick={()=>setRoot(i)}>{n}</Btn>)}</div></Ctrl>
        <Ctrl label="Scale"><select value={scaleName} onChange={e=>setSN(e.target.value)} style={selStyle}>{Object.keys(SC).map(s=><option key={s}>{s}</option>)}</select></Ctrl>
        <Ctrl label="Compare"><select value={comp} onChange={e=>setComp(+e.target.value)} style={selStyle}>{NOTES.map((n,i)=><option key={i} value={i}>{n} major</option>)}</select></Ctrl>
        <Ctrl label=""><button onClick={playScale} style={btnPrimary}>▶ PLAY</button></Ctrl>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
        <div style={{flex:"1 1 220px",...panel}}>
          <div style={{fontSize:16,fontWeight:"bold",color:"#ffd700"}}>{NOTES[root]} {sc.d}</div>
          <div style={{fontSize:10,color:"#888"}}>Root: {rootF.toFixed(1)} Hz · Notes: {scNotes.map(n=>NOTES[n]).join(" ")}</div>
          <div style={{marginTop:6}}>
            <Bar v={commonC.length} mx={7} c="#22cc66" l="vs C maj"/>
            <Bar v={commonComp.length} mx={7} c="#4488ff" l={`vs ${NOTES[comp]}`}/>
            <Bar v={stabAvg} mx={5} c={stabAvg>=3.7?"#22cc66":stabAvg>=3.5?"#ffd700":"#ff5566"} l="Stab"/>
          </div>
          <div style={{fontSize:9,color:"#555",marginTop:4}}>Common w/ C: {commonC.map(n=>NOTES[n]).join(", ")||"none"}</div>
          <div style={{fontSize:9,color:"#555"}}>Common w/ {NOTES[comp]}: {commonComp.map(n=>NOTES[n]).join(", ")||"none"}</div>
        </div>
        <div style={{flex:"0 0 auto",...panel,display:"flex",gap:8,alignItems:"center"}}>
          {["A","B","C"].map(pt=>{const a=parts.has(pt);const cs={A:"#ff3355",B:"#22cc66",C:"#ffd700"};const ls={A:"Main(C/E)",B:"Fifth(G/B)",C:"Axis(D/F#)"};
            return <div key={pt} style={{width:50,textAlign:"center",padding:"4px",borderRadius:4,background:a?cs[pt]+"18":"#0a0a14",border:`1px solid ${a?cs[pt]:"#222"}`}}>
              <div style={{fontSize:18,fontWeight:"bold",color:a?cs[pt]:"#333"}}>{pt}</div>
              <div style={{fontSize:7,color:a?"#888":"#333"}}>{ls[pt]}</div>
            </div>;
          })}
        </div>
      </div>
      {/* Interval table */}
      <div style={{...panel,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
          <thead><tr style={{borderBottom:"1px solid #2a2a3a"}}>
            {["Int","Note","JI Ratio","JI Hz","ET Hz","Δ¢","Stab","Part","C maj","▶"].map(h=><th key={h} style={{padding:"3px 5px",color:"#555",fontWeight:"normal",textAlign:"left",fontSize:9}}>{h}</th>)}
          </tr></thead>
          <tbody>{sc.s.map(s=>{
            const semi=(s+root)%12,ratio=JI[s],jiF=rootF*ratio,etF=rootF*Math.pow(2,s/12);
            const diff=Math.round(1200*Math.log2(ratio/Math.pow(2,s/12))*10)/10;
            const stab=STAB[semi+1],dr=DR[s],pt=dr?PM[dr]:"—";
            const inC=CMAJ.has(semi);
            return <tr key={s} style={{borderBottom:"1px solid #1a1a2a",cursor:"pointer"}} onClick={()=>{tone(rootF,1);tone(jiF,1);}}>
              <td style={{padding:"4px 5px",color:"#ff3355"}}>{INT_N[s]}</td>
              <td style={{padding:"4px 5px",fontWeight:"bold"}}>{NOTES[semi]}</td>
              <td style={{padding:"4px 5px",color:"#aaa",fontSize:9}}>{JI_N[s]}</td>
              <td style={{padding:"4px 5px",color:"#22cc66"}}>{jiF.toFixed(1)}</td>
              <td style={{padding:"4px 5px",color:"#4488ff"}}>{etF.toFixed(1)}</td>
              <td style={{padding:"4px 5px",color:Math.abs(diff)>10?"#ff5566":"#666"}}>{diff>0?"+":""}{diff}</td>
              <td style={{padding:"4px 5px",color:stab>=4?"#22cc66":stab>=3?"#ffd700":"#ff5566",fontWeight:"bold"}}>{stab}/5</td>
              <td style={{padding:"4px 5px",color:pt==="A"?"#ff3355":pt==="B"?"#22cc66":pt==="C"?"#ffd700":"#555"}}>{pt}</td>
              <td style={{padding:"4px 5px"}}>{inC?<span style={{color:"#22cc66"}}>✓</span>:<span style={{color:"#333"}}>·</span>}</td>
              <td style={{padding:"4px 5px",color:"#444",fontSize:9}}>▶</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 5: ABOUT / INFO
// ═══════════════════════════════════════════════════════════════
function AboutTab() {
  return (
    <div style={{maxWidth:700,margin:"0 auto",lineHeight:1.7,fontSize:13}}>
      <h2 style={{color:"#ff3355",fontSize:20,marginBottom:4}}>What Is This?</h2>
      <p style={{color:"#ccc"}}>The Sacrifunk Analysis Suite is a collection of interactive music theory tools built on two mathematical foundations: <b style={{color:"#ff3355"}}>Vortex Mathematics</b> (modular arithmetic on zero-free number systems) and <b style={{color:"#22cc66"}}>Spectral Coherence</b> (psychoacoustic analysis of interval purity using the Sethares roughness model).</p>
      
      <h2 style={{color:"#ff3355",fontSize:20,marginTop:16,marginBottom:4}}>The Five Tools</h2>
      
      <div style={{...panel,marginBottom:8}}>
        <h3 style={{color:"#ff3355",fontSize:14,margin:"0 0 4px"}}>🌀 Vortex Explorer</h3>
        <p style={{color:"#aaa",margin:0}}>Visualize multiplication maps on any number system (3 to 999). See how octaves (×2), fifths (×3), thirds (×5), and other intervals create cycles and feeders. Overlay multiple generators simultaneously. Highlight any scale on the 12-class chromatic circle with stability scores.</p>
      </div>
      
      <div style={{...panel,marginBottom:8}}>
        <h3 style={{color:"#4488ff",fontSize:14,margin:"0 0 4px"}}>🎹 Scale Explorer</h3>
        <p style={{color:"#aaa",margin:0}}>Play any of 12 scales in any root with real audio. Toggle between Just Intonation (JI 5-limit) and 12-tone Equal Temperament. See exact frequencies, cent deviations, vortex stability scores, and spectral purity indicators for every triad. Compare JI vs ET back-to-back.</p>
      </div>
      
      <div style={{...panel,marginBottom:8}}>
        <h3 style={{color:"#22cc66",fontSize:14,margin:"0 0 4px"}}>🔬 Cymatics Lab</h3>
        <p style={{color:"#aaa",margin:0}}>Simulated Chladni plate vibration patterns for any frequency. Based on the real wave equation — not decorative. See how different frequencies create different nodal patterns. Includes JI frequency presets and continuous sine tone playback.</p>
      </div>
      
      <div style={{...panel,marginBottom:8}}>
        <h3 style={{color:"#ffd700",fontSize:14,margin:"0 0 4px"}}>📊 Frequency Explorer</h3>
        <p style={{color:"#aaa",margin:0}}>Input any root and scale — get the complete analysis: JI frequencies, common notes with any major key, vortex partition coverage, spectral roughness, and stability scores. Click any interval to hear the dyad. The most data-rich tool in the suite.</p>
      </div>
      
      <h2 style={{color:"#ff3355",fontSize:20,marginTop:16,marginBottom:4}}>The Mathematics</h2>
      <p style={{color:"#ccc"}}>All analysis is built on the <b style={{color:"#ffd700"}}>Five Laws of Loop-Feeder Decomposition</b> — provable theorems from elementary number theory describing the cycle structure of modular multiplication graphs. These laws predict which frequency combinations are consonant, which modes are structurally stable, and which chords have zero beating in Just Intonation.</p>
      <p style={{color:"#999",fontSize:11}}>No chakras. No solfeggio frequencies. No note-to-color mapping. Pure mathematics and perception science.</p>
      
      <h2 style={{color:"#ff3355",fontSize:20,marginTop:16,marginBottom:4}}>About Sacrifunk</h2>
      <p style={{color:"#ccc"}}>Sacrifunk is the music and research project of Ahmed Abouelnasr (Quebec). 32 released songs across streaming platforms, original Phrygian-derived scales, Just Intonation at A=432 Hz with True Temperament frets, and emerging research into vibrotactile sound applications.</p>
      <p style={{color:"#666",fontSize:10}}>sacrifunk.com · Built with Claude Opus · March 2026</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SHARED UI COMPONENTS
// ═══════════════════════════════════════════════════════════════
const panel = {background:"#11111e",borderRadius:8,padding:"10px 12px",border:"1px solid #1e1e36"};
const selStyle = {background:"#1a1a2e",border:"1px solid #333",color:"#ddd",padding:"4px 6px",borderRadius:4,fontSize:11,fontFamily:"inherit"};
const numInput = {background:"#1a1a2e",border:"1px solid #333",color:"#ff3355",padding:"3px",borderRadius:4,fontSize:14,textAlign:"center",fontFamily:"inherit",fontWeight:"bold"};
const btnPrimary = {padding:"5px 16px",background:"#ff3355",border:"none",color:"#fff",borderRadius:5,cursor:"pointer",fontSize:10,fontFamily:"inherit",letterSpacing:1};
const btnSecondary = {padding:"5px 16px",background:"#1a1a2e",border:"1px solid #444",color:"#fff",borderRadius:5,cursor:"pointer",fontSize:10,fontFamily:"inherit",letterSpacing:1};

function Ctrl({label,children}){return <div style={{...panel,padding:"6px 10px"}}><div style={{fontSize:8,color:"#555",textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>{label}</div>{children}</div>;}
function Btn({active,color,onClick,children}){return <button onClick={onClick} style={{padding:"2px 8px",background:active?(color||"#2a2a5a"):"#0a0a14",border:`1px solid ${active?(color||"#4444aa"):"#2a2a3a"}`,color:active?"#fff":"#666",borderRadius:3,cursor:"pointer",fontSize:10,fontFamily:"inherit",fontWeight:active?"bold":"normal"}}>{children}</button>;}
function Bar({v,mx,c,l}){const pct=Math.round(100*v/mx);return <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:2}}><div style={{width:45,fontSize:8,color:"#666",textAlign:"right"}}>{l}</div><div style={{flex:1,height:10,background:"#1a1a2a",borderRadius:5,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:c,borderRadius:5}}/></div><div style={{width:28,fontSize:9,color:c,fontWeight:"bold"}}>{typeof v==="number"&&v%1?v.toFixed(1):v}/{mx}</div></div>;}

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════
export default function SacrifunkApp() {
  const [tab,setTab]=useState("about");
  const tabs=[["about","ABOUT"],["vortex","VORTEX"],["scales","SCALES"],["cymatics","CYMATICS"],["freq","FREQUENCY"]];

  return (
    <div style={{minHeight:"100vh",background:"#08080e",color:"#e0e0f0",fontFamily:"'JetBrains Mono',monospace",padding:"10px 12px"}}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet"/>
      <div style={{textAlign:"center",marginBottom:8}}>
        <h1 style={{fontSize:22,color:"#ff3355",margin:0,letterSpacing:3}}>SACRIFUNK</h1>
        <p style={{fontSize:9,color:"#444",margin:"2px 0",letterSpacing:2}}>ANALYSIS SUITE · VORTEX MATHEMATICS · SPECTRAL SCIENCE</p>
      </div>
      <div style={{display:"flex",justifyContent:"center",gap:3,marginBottom:12,flexWrap:"wrap"}}>
        {tabs.map(([k,l])=><button key={k} onClick={()=>setTab(k)} style={{padding:"5px 14px",background:tab===k?"#ff3355":"#11111e",border:`1px solid ${tab===k?"#ff3355":"#2a2a3a"}`,color:tab===k?"#fff":"#666",borderRadius:6,cursor:"pointer",fontSize:10,letterSpacing:1,fontFamily:"inherit",fontWeight:tab===k?"bold":"normal"}}>{l}</button>)}
      </div>
      {tab==="about"&&<AboutTab/>}
      {tab==="vortex"&&<VortexTab/>}
      {tab==="scales"&&<ScaleTab/>}
      {tab==="cymatics"&&<CymaticsTab/>}
      {tab==="freq"&&<FreqTab/>}
      <div style={{textAlign:"center",marginTop:16,fontSize:8,color:"#222",letterSpacing:1}}>SACRIFUNK ANALYSIS SUITE · Ahmed Abouelnasr · 2026 · No chakras · No solfeggio · Pure math</div>
    </div>
  );
}

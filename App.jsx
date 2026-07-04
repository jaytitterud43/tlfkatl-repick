import React, { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "";

const FLAG = {
  "Mexico":"🇲🇽","South Korea":"🇰🇷","South Africa":"🇿🇦","Czechia":"🇨🇿","Canada":"🇨🇦",
  "Switzerland":"🇨🇭","Qatar":"🇶🇦","Bosnia-Herzegovina":"🇧🇦","Brazil":"🇧🇷","Morocco":"🇲🇦",
  "Scotland":"🏴","Haiti":"🇭🇹","United States":"🇺🇸","Paraguay":"🇵🇾","Australia":"🇦🇺",
  "Türkiye":"🇹🇷","Germany":"🇩🇪","Ecuador":"🇪🇨","Ivory Coast":"🇨🇮","Curaçao":"🇨🇼",
  "Netherlands":"🇳🇱","Japan":"🇯🇵","Tunisia":"🇹🇳","Sweden":"🇸🇪","Belgium":"🇧🇪","Iran":"🇮🇷",
  "Egypt":"🇪🇬","New Zealand":"🇳🇿","Spain":"🇪🇸","Uruguay":"🇺🇾","Saudi Arabia":"🇸🇦",
  "Cape Verde":"🇨🇻","France":"🇫🇷","Senegal":"🇸🇳","Norway":"🇳🇴","Iraq":"🇮🇶","Argentina":"🇦🇷",
  "Austria":"🇦🇹","Algeria":"🇩🇿","Jordan":"🇯🇴","Portugal":"🇵🇹","Colombia":"🇨🇴",
  "Uzbekistan":"🇺🇿","DR Congo":"🇨🇩","England":"🏴","Croatia":"🇭🇷","Panama":"🇵🇦","Ghana":"🇬🇭",
};

// The REAL Round of 16 matchups (correct FIFA tree), in bracket order (M89..M96).
// Two are auto-awarded to everyone (already underway) and NOT re-picked.
const R16 = [
  { a:"Paraguay", b:"France",  auto:false },   // M89
  { a:"Canada",   b:"Morocco", auto:true  },   // M90 — AUTO-AWARDED
  { a:"Brazil",   b:"Norway",  auto:false },   // M91
  { a:"Mexico",   b:"England", auto:false },   // M92
  { a:"Portugal", b:"Spain",   auto:false },   // M93
  { a:"United States", b:"Belgium", auto:false }, // M94
  { a:"Australia/Egypt-winner", b:"Argentina/Cape Verde-winner", auto:false, tbdA:["Australia","Egypt"], tbdB:["Argentina","Cape Verde"] }, // M95
  { a:"Switzerland", b:"Colombia/Ghana-winner", auto:false, tbdB:["Colombia","Ghana"] }, // M96
];

const C = { ink:"#0E1B2A", paper:"#F4EFE6", grass:"#0B6E4F", grassDk:"#084d37",
  gold:"#E8B53A", red:"#C8472E", line:"#d8cfbf", mute:"#6b7d72" };
const F_DISP="'Bebas Neue','Arial Narrow',sans-serif";
const F_BODY="'DM Sans',system-ui,sans-serif";

export default function App(){
  const [me,setMe] = useState("");
  const [phone,setPhone] = useState("");
  const [step,setStep] = useState("id"); // id -> r16 -> qf -> sf -> final -> done
  const [r16,setR16] = useState({});   // matchIndex -> winner (only non-auto games)
  const [qf,setQf] = useState({});
  const [sf,setSf] = useState({});
  const [final,setFinal] = useState({});
  const [status,setStatus] = useState(null); // repickstatus (which games locked)
  const [submitting,setSubmitting] = useState(false);

  useEffect(()=>{ try{
    const raw=localStorage.getItem("tlfkatl_repick_draft");
    if(raw){const d=JSON.parse(raw);setMe(d.me||"");setPhone(d.phone||"");
      setR16(d.r16||{});setQf(d.qf||{});setSf(d.sf||{});setFinal(d.final||{});}
  }catch(e){} },[]);
  useEffect(()=>{ try{
    localStorage.setItem("tlfkatl_repick_draft",JSON.stringify({me,phone,r16,qf,sf,final}));
  }catch(e){} },[me,phone,r16,qf,sf,final]);

  useEffect(()=>{ fetch(`${API}/repickstatus`).then(r=>r.json()).then(setStatus).catch(()=>{}); },[]);

  // resolve a team label for a game (handles TBD winners we don't know yet)
  function teamLabel(g,side){
    const base = side==="a"?g.a:g.b;
    return base;
  }

  // R16 games the user actually picks (exclude auto). Also mark locked if kicked off.
  function lockedFor(g){
    if(!status) return false;
    const m=(status.matches||[]).find(x=>{
      const k=[x.home,x.away].sort().join("|");
      return k===[g.a,g.b].sort().join("|");
    });
    if(!m||!m.datetime) return false;
    return Date.now() >= new Date(m.datetime).getTime();
  }

  // derived QF/SF/Final matchups from R16 winners (correct tree: adjacent pairs)
  function r16Winner(i){ const g=R16[i]; if(g.auto) return "AUTO"; return r16[i]||null; }
  // For QF, we need actual advancing teams. Auto games: winner known from results? We keep it simple:
  // the re-pick only needs the user to choose among teams THEY advance. For auto games the real
  // winner will be filled by scoring; here we let them pick QF from their own R16 winners.
  function pairWinners(getter,n){
    const arr=[]; for(let i=0;i<n;i++) arr.push(getter(i));
    const out=[]; for(let i=0;i<arr.length;i+=2) out.push([arr[i],arr[i+1]]); return out;
  }

  const r16PickNeeded = R16.map((g,i)=>({g,i})).filter(x=>!x.g.auto);
  const r16Done = r16PickNeeded.every(x=> r16[x.i] || lockedFor(x.g));

  // QF matchups: pair R16 winners (index order). For auto games, user picks the auto team? 
  // Simplify: QF uses whichever team advanced per this user's R16 choices; auto game -> user still
  // chooses at QF from the two auto teams (Canada/Morocco) since result may not be final.
  function r16Adv(i){
    const g=R16[i];
    if(g.auto){ return qf[`auto${i}`] || null; } // let them choose the auto team for downstream
    return r16[i]||null;
  }
  const qfGames = pairWinners(r16Adv,8);
  const qfDone = qfGames.every((g,i)=> (g[0]&&g[1]) ? qf[i] : true);

  function qfAdv(i){ return qf[i]||null; }
  const sfGames = pairWinners(qfAdv,4);
  const sfDone = sfGames.every((g,i)=> (g[0]&&g[1]) ? sf[i] : true);

  function sfAdv(i){ return sf[i]||null; }
  const finalGames = pairWinners(sfAdv,2);
  const finalDone = finalGames.every((g,i)=> (g[0]&&g[1]) ? final[i] : true);

  async function submit(){
    if(submitting) return;
    setSubmitting(true);
    // build bracket2 payload with real matchups
    const bracket = {
      r16: R16.map((g,i)=>({ match:[g.a,g.b], pick: g.auto ? null : (r16[i]||null), auto:!!g.auto })),
      qf:  qfGames.map((m,i)=>({ match:m, pick: qf[i]||null })),
      sf:  sfGames.map((m,i)=>({ match:m, pick: sf[i]||null })),
      final: finalGames.map((m,i)=>({ match:m, pick: final[i]||null })),
      champion: final[0]||null,
    };
    try{
      const res=await fetch(`${API}/bracket2`,{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({username:me.trim(),phone:phone.trim(),bracket,submittedAt:Date.now()}),
      });
      if(!res.ok){ const j=await res.json().catch(()=>({})); throw new Error(j.error||"save"); }
      localStorage.removeItem("tlfkatl_repick_draft");
      setStep("done");
    }catch(e){ alert(e.message==="save"?"Couldn't save — try again.":e.message); }
    finally{ setSubmitting(false); }
  }

  return (
    <div style={{fontFamily:F_BODY,color:C.ink,background:C.paper,minHeight:"100vh",
      maxWidth:430,margin:"0 auto",paddingBottom:96}}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet"/>
      <style>{`*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
        @keyframes rise{from{transform:translateY(8px);opacity:0}to{transform:none;opacity:1}}.sec{animation:rise .25s ease}`}</style>

      <div style={{padding:"18px 16px 8px",textAlign:"center"}}>
        <div style={{fontFamily:F_DISP,fontSize:30,letterSpacing:1}}>TLFKATL</div>
        <div style={{color:C.grass,fontWeight:700,letterSpacing:2.5,fontSize:10.5,marginTop:2}}>BRACKET RE-PICK · R16 →</div>
      </div>

      <div style={{padding:"4px 16px"}}>
        {step==="id" && <Identify me={me} setMe={setMe} phone={phone} setPhone={setPhone}/>}
        {step==="r16" && <R16Picker R16={R16} r16={r16} setR16={setR16} lockedFor={lockedFor}/>}
        {step==="qf" && <RoundPicker title="Quarterfinals" sub="18 pts each" games={qfGames}
          picks={qf} setPick={(i,t)=>setQf({...qf,[i]:t})} autoNote/>}
        {step==="sf" && <RoundPicker title="Semifinals" sub="30 pts each" games={sfGames}
          picks={sf} setPick={(i,t)=>setSf({...sf,[i]:t})}/>}
        {step==="final" && <RoundPicker title="The Final" sub="52 pts · your champion" games={finalGames}
          picks={final} setPick={(i,t)=>setFinal({...final,[i]:t})} champion/>}
        {step==="done" && <Done me={me} champ={final[0]}/>}
      </div>

      {step!=="done" && (
        <Footer step={step}
          canNext={
            step==="id" ? (me.trim().length>=2 && phone.trim().length>=7) :
            step==="r16" ? r16Done : step==="qf" ? qfDone : step==="sf" ? sfDone : finalDone
          }
          submitting={submitting}
          back={()=>setStep(prev(step))}
          next={()=>{ step==="final" ? submit() : setStep(next(step)); }}
        />
      )}
    </div>
  );
}

const ORDER=["id","r16","qf","sf","final"];
function next(s){ return ORDER[Math.min(ORDER.length-1,ORDER.indexOf(s)+1)]; }
function prev(s){ return ORDER[Math.max(0,ORDER.indexOf(s)-1)]; }

function Identify({me,setMe,phone,setPhone}){
  return (
    <div className="sec" style={{paddingTop:16}}>
      <div style={{textAlign:"center",fontSize:44,marginBottom:6}}>🔁</div>
      <h2 style={{fontFamily:F_DISP,fontSize:30,textAlign:"center",margin:"0 0 6px",letterSpacing:.5}}>RE-PICK YOUR BRACKET</h2>
      <p style={{textAlign:"center",color:C.mute,fontSize:13.5,lineHeight:1.5,margin:"0 0 16px"}}>
        The original bracket had the wrong Round of 16 matchups, so we're re-doing R16 onward on the correct bracket. Your Round of 32 points are locked in and unaffected.
      </p>
      <div style={{background:"#fff",border:`1px solid ${C.line}`,borderRadius:14,padding:"12px 15px",marginBottom:16,fontSize:12.5,color:C.mute,lineHeight:1.5}}>
        <b style={{color:C.ink}}>Note:</b> Canada v Morocco and Paraguay v France already kicked off, so everyone gets those 10 pts automatically — you won't pick them.
      </div>
      <div style={{background:"#fff",border:`1px solid ${C.line}`,borderRadius:16,padding:18}}>
        <Label>USERNAME</Label>
        <div style={{fontSize:11.5,color:C.mute,margin:"0 0 6px"}}>Use the SAME name as your original picks.</div>
        <input value={me} onChange={e=>setMe(e.target.value)} placeholder="e.g. himbo_jay" style={inp}/>
        <div style={{height:14}}/>
        <Label>PHONE</Label>
        <input value={phone} onChange={e=>setPhone(e.target.value)} inputMode="tel" placeholder="(555) 123-4567" style={inp}/>
      </div>
    </div>
  );
}

function R16Picker({R16,r16,setR16,lockedFor}){
  return (
    <div className="sec" style={{paddingTop:8}}>
      <h2 style={{fontFamily:F_DISP,fontSize:32,margin:"2px 0",letterSpacing:.5}}>Round of 16</h2>
      <div style={{fontSize:12.5,color:C.mute,marginBottom:14}}>Correct matchups · 10 pts each</div>
      {R16.map((g,i)=>{
        if(g.auto){
          return (
            <div key={i} style={{background:"#eef3f0",border:`1.5px solid ${C.grass}`,borderRadius:12,
              padding:"12px 14px",marginBottom:10}}>
              <div style={{fontSize:10,color:C.grass,fontWeight:700,letterSpacing:.5,marginBottom:4}}>AUTO-AWARDED · +10 TO EVERYONE</div>
              <div style={{fontWeight:700,fontSize:14}}>{FLAG[g.a]} {g.a} v {g.b} {FLAG[g.b]}</div>
              <div style={{fontSize:11.5,color:C.mute,marginTop:2}}>Already underway — no pick needed.</div>
            </div>
          );
        }
        const locked=lockedFor(g);
        return (
          <div key={i} style={{marginBottom:10,opacity:locked?.55:1}}>
            <div style={{fontSize:10,color:C.mute,marginBottom:4,letterSpacing:.5}}>
              MATCH {i+1}{locked?" · LOCKED (kicked off)":""}
            </div>
            <div style={{display:"flex",gap:8}}>
              {["a","b"].map(side=>{
                const team=g[side]; const on=r16[i]===team;
                return (
                  <button key={side} disabled={locked} onClick={()=>!locked&&setR16({...r16,[i]:team})} style={{
                    flex:1,padding:"14px 8px",borderRadius:12,fontSize:14,fontWeight:on?700:600,
                    border:`1.5px solid ${on?C.grass:C.line}`,background:on?C.grass:"#fff",
                    color:on?"#fff":C.ink,cursor:locked?"default":"pointer",fontFamily:F_BODY,textAlign:"left",lineHeight:1.2}}>
                    <div style={{fontSize:18}}>{FLAG[team]}</div>
                    <div style={{marginTop:3}}>{team}</div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RoundPicker({title,sub,games,picks,setPick,champion,autoNote}){
  return (
    <div className="sec" style={{paddingTop:8}}>
      <h2 style={{fontFamily:F_DISP,fontSize:32,margin:"2px 0",letterSpacing:.5}}>{title}</h2>
      <div style={{fontSize:12.5,color:C.mute,marginBottom:6}}>{sub}</div>
      {autoNote && <div style={{fontSize:11.5,color:C.mute,marginBottom:12,lineHeight:1.5}}>
        For the auto-awarded R16 game, pick which of those two teams you think advances here.</div>}
      {games.map((g,i)=>{
        const ready=g[0]&&g[1];
        return (
          <div key={i} style={{marginBottom:10}}>
            <div style={{fontSize:10,color:C.mute,marginBottom:4,letterSpacing:.5}}>{champion?"CHAMPION":"MATCH "+(i+1)}</div>
            {!ready ? (
              <div style={{background:"#fff",border:`1px dashed ${C.line}`,borderRadius:12,padding:"14px",
                fontSize:13,color:C.mute}}>Depends on earlier picks — finish those first.</div>
            ) : (
              <div style={{display:"flex",gap:8}}>
                {[0,1].map(side=>{
                  const team=g[side]; const on=picks[i]===team;
                  return (
                    <button key={side} onClick={()=>setPick(i,team)} style={{
                      flex:1,padding:"14px 8px",borderRadius:12,fontSize:14,fontWeight:on?700:600,
                      border:`1.5px solid ${on?C.grass:C.line}`,background:on?C.grass:"#fff",
                      color:on?"#fff":C.ink,cursor:"pointer",fontFamily:F_BODY,textAlign:"left",lineHeight:1.2}}>
                      <div style={{fontSize:18}}>{FLAG[team]||"·"}</div>
                      <div style={{marginTop:3}}>{team}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Done({me,champ}){
  return (
    <div className="sec" style={{textAlign:"center",paddingTop:60}}>
      <div style={{fontSize:60}}>✅</div>
      <h2 style={{fontFamily:F_DISP,fontSize:36,margin:"12px 0 6px",letterSpacing:1}}>RE-PICK SAVED</h2>
      <p style={{color:C.mute,fontSize:15,lineHeight:1.6,maxWidth:300,margin:"0 auto"}}>
        Thanks <b style={{color:C.ink}}>{me}</b> — your R16-onward picks are in on the correct bracket.
      </p>
      {champ && <>
        <div style={{fontSize:38,marginTop:14}}>{FLAG[champ]}</div>
        <div style={{fontFamily:F_DISP,fontSize:28,marginTop:2}}>{champ}</div>
      </>}
      <div style={{marginTop:22,fontSize:13,color:C.mute}}>You can close this page.</div>
    </div>
  );
}

const inp={width:"100%",padding:"13px 14px",borderRadius:11,border:`1.5px solid ${C.line}`,
  fontSize:15,fontFamily:F_BODY,background:"#fff",color:C.ink,outline:"none"};
function Label({children}){
  return <div style={{fontSize:11,fontWeight:700,letterSpacing:1,color:C.mute,marginBottom:6}}>{children}</div>;
}
function Footer({step,canNext,back,next,submitting}){
  return (
    <div style={{position:"fixed",bottom:0,left:0,right:0,maxWidth:430,margin:"0 auto",
      background:"rgba(244,239,230,.94)",backdropFilter:"blur(8px)",borderTop:`1px solid ${C.line}`,
      padding:"12px 16px",display:"flex",gap:10}}>
      {step!=="id" && (
        <button onClick={back} style={{padding:"14px 18px",borderRadius:12,border:`1.5px solid ${C.line}`,
          background:"#fff",fontWeight:700,fontSize:14,color:C.ink,cursor:"pointer"}}>Back</button>
      )}
      <button onClick={next} disabled={!canNext||submitting} style={{
        flex:1,padding:"14px",borderRadius:12,border:"none",fontWeight:700,fontSize:15,
        background:(canNext&&!submitting)?C.grass:C.line,color:(canNext&&!submitting)?"#fff":C.mute,
        cursor:(canNext&&!submitting)?"pointer":"not-allowed",fontFamily:F_BODY}}>
        {submitting?"Saving…": step==="id"?"Start re-pick →": step==="final"?"Lock in re-pick ✓":"Next round →"}
      </button>
    </div>
  );
}

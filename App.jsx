import React, { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "";

const FLAG = { "France":"🇫🇷", "Spain":"🇪🇸", "Argentina":"🇦🇷" };
// England uses a subdivision flag emoji that shows as a black box on many devices,
// so render a reliable text badge for it instead.
const SUBDIV = { "England":"ENG" };
function Flag({team}){
  if (SUBDIV[team]) return <span style={{fontSize:12,fontWeight:800,letterSpacing:.5,color:"#fff",background:"#C8472E",borderRadius:4,padding:"2px 6px"}}>{SUBDIV[team]}</span>;
  return <span style={{fontSize:22}}>{FLAG[team]||"·"}</span>;
}

// The real semifinals on the correct tree (all four teams known):
//  SF1: France v Spain     SF2: England v Argentina
// Final: SF1 winner v SF2 winner.
const SF = [
  { key:"sf1", a:"France", b:"Spain" },
  { key:"sf2", a:"England", b:"Argentina" },
];

const C = { ink:"#0E1B2A", paper:"#F4EFE6", grass:"#0B6E4F", grassDk:"#084d37",
  gold:"#E8B53A", red:"#C8472E", line:"#d8cfbf", mute:"#6b7d72" };
const F_DISP="'Bebas Neue','Arial Narrow',sans-serif";
const F_BODY="'DM Sans',system-ui,sans-serif";

export default function App(){
  const [me,setMe] = useState("");
  const [phone,setPhone] = useState("");
  const [step,setStep] = useState("id"); // id -> pick -> done
  const [sf,setSf] = useState({});       // sf1/sf2 -> winner
  const [champ,setChamp] = useState(null);
  const [status,setStatus] = useState("");
  const [locked,setLocked] = useState(false);

  useEffect(()=>{
    const saved = localStorage.getItem("tlfkatl_me");
    if(saved){ try{ const o=JSON.parse(saved); setMe(o.name||""); setPhone(o.phone||""); }catch{} }
    const draft = localStorage.getItem("tlfkatl_semis_draft");
    if(draft){ try{ const o=JSON.parse(draft); setSf(o.sf||{}); setChamp(o.champ||null); }catch{} }
    // check whether SF1 (earliest game) has kicked off -> lock
    fetch(`${API}/knockout`).then(r=>r.json()).then(k=>{
      const ko=k.koByPair||{};
      const anySF = Object.values(ko).some(g=>g.round && g.round.toLowerCase().startsWith("semi") && g.status!=="scheduled");
      if(anySF) setLocked(true);
    }).catch(()=>{});
  },[]);

  useEffect(()=>{
    localStorage.setItem("tlfkatl_semis_draft", JSON.stringify({sf,champ}));
  },[sf,champ]);

  // The two possible finalists come from the SF picks
  const finalists = [sf.sf1, sf.sf2].filter(Boolean);
  const canSubmit = sf.sf1 && sf.sf2 && champ && finalists.includes(champ);

  function pickSF(key,team){
    setSf(prev=>{
      const next={...prev,[key]:team};
      // if champion was the team no longer available, clear it
      const fs=[next.sf1,next.sf2].filter(Boolean);
      if(champ && !fs.includes(champ)) setChamp(null);
      return next;
    });
  }

  async function submit(){
    if(!canSubmit) return;
    setStatus("saving");
    const bracket = {
      sf: [
        { pick: sf.sf1, match:["France","Spain"] },
        { pick: sf.sf2, match:["England","Argentina"] },
      ],
      final: [{ pick: champ, match:[sf.sf1, sf.sf2] }],
      champion: champ,
    };
    try{
      const res = await fetch(`${API}/bracket3`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ username: me, phone, bracket }),
      });
      if(!res.ok) throw new Error("save failed");
      localStorage.setItem("tlfkatl_me", JSON.stringify({name:me,phone}));
      setStep("done");
    }catch(e){ setStatus("error"); }
  }

  const wrap = { maxWidth:520, margin:"0 auto", padding:"18px 16px 60px", fontFamily:F_BODY, color:C.ink };

  if(step==="id"){
    return (
      <div style={{background:C.paper,minHeight:"100vh"}}>
        <div style={wrap}>
          <Header/>
          {locked && <LockNote/>}
          <div style={card}>
            <SecLabel>WHO ARE YOU?</SecLabel>
            <input value={me} onChange={e=>setMe(e.target.value)} placeholder="username"
              style={inp}/>
            <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="phone"
              style={inp}/>
            <button disabled={!me||!phone||locked} onClick={()=>setStep("pick")}
              style={{...btn, opacity:(!me||!phone||locked)?.5:1}}>
              {locked ? "Picks are locked" : "Start picking →"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if(step==="done"){
    return (
      <div style={{background:C.paper,minHeight:"100vh"}}>
        <div style={wrap}>
          <Header/>
          <div style={{...card,textAlign:"center"}}>
            <div style={{fontSize:44,marginBottom:6}}>✅</div>
            <div style={{fontFamily:F_DISP,fontSize:30,color:C.grass}}>PICKS IN, {me.toUpperCase()}!</div>
            <div style={{marginTop:14,fontSize:14,lineHeight:1.6}}>
              <div><b>{sf.sf1}</b> & <b>{sf.sf2}</b> to the final</div>
              <div style={{marginTop:6}}>🏆 Champion: <b>{champ}</b></div>
            </div>
            <div style={{marginTop:16,fontSize:12,color:C.mute}}>Check the leaderboard to see how you stack up.</div>
          </div>
        </div>
      </div>
    );
  }

  // step === "pick"
  return (
    <div style={{background:C.paper,minHeight:"100vh"}}>
      <div style={wrap}>
        <Header/>
        {locked && <LockNote/>}
        <div style={card}>
          <SecLabel>SEMIFINALS · 30 pts each</SecLabel>
          <div style={{fontSize:12,color:C.mute,marginBottom:12}}>Pick who reaches the final from each semi.</div>
          {SF.map(g=>(
            <div key={g.key} style={{marginBottom:16}}>
              <div style={{fontSize:11,color:C.mute,marginBottom:5,letterSpacing:.5}}>
                {g.key==="sf1"?"SEMIFINAL 1":"SEMIFINAL 2"}
              </div>
              <div style={{display:"flex",gap:8}}>
                {[g.a,g.b].map(team=>(
                  <button key={team} disabled={locked} onClick={()=>pickSF(g.key,team)}
                    style={teamBtn(sf[g.key]===team)}>
                    <Flag team={team}/> <span style={{marginLeft:8}}>{team}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={card}>
          <SecLabel>CHAMPION · 52 pts</SecLabel>
          {finalists.length<2 ? (
            <div style={{fontSize:13,color:C.mute}}>Pick both semifinal winners first.</div>
          ) : (
            <div style={{display:"flex",gap:8}}>
              {finalists.map(team=>(
                <button key={team} disabled={locked} onClick={()=>setChamp(team)}
                  style={teamBtn(champ===team)}>
                  <Flag team={team}/> <span style={{marginLeft:8}}>{team}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button disabled={!canSubmit||locked} onClick={submit}
          style={{...btn, opacity:(!canSubmit||locked)?.5:1}}>
          {status==="saving"?"Saving…":status==="error"?"Error — try again":"Submit picks"}
        </button>
      </div>
    </div>
  );
}

function Header(){
  return (
    <div style={{textAlign:"center",marginBottom:16}}>
      <div style={{fontFamily:F_DISP,fontSize:34,color:C.grass,letterSpacing:1,lineHeight:1}}>TLFKATL WORLD CUP</div>
      <div style={{fontSize:12,color:C.mute,marginTop:2,letterSpacing:2}}>SEMIS & FINAL PICK'EM</div>
    </div>
  );
}
function LockNote(){
  return <div style={{background:"#f6e6e2",border:`1px solid ${C.red}`,borderRadius:10,padding:"10px 12px",fontSize:12.5,color:C.red,marginBottom:12}}>
    The semifinals have kicked off — picks are locked.
  </div>;
}
function SecLabel({children}){ return <div style={{fontFamily:F_DISP,fontSize:18,letterSpacing:1,color:C.grassDk,marginBottom:8}}>{children}</div>; }

const card = { background:"#fff", border:`1px solid ${C.line}`, borderRadius:14, padding:"15px 15px", marginBottom:14 };
const inp = { display:"block", width:"100%", boxSizing:"border-box", padding:"12px 13px", marginBottom:10,
  border:`1.5px solid ${C.line}`, borderRadius:10, fontSize:15, fontFamily:F_BODY };
const btn = { display:"block", width:"100%", padding:"14px", background:C.grass, color:"#fff",
  border:"none", borderRadius:12, fontSize:16, fontWeight:700, cursor:"pointer", fontFamily:F_BODY };
function teamBtn(active){
  return { flex:1, display:"flex", alignItems:"center", justifyContent:"center",
    padding:"14px 10px", borderRadius:12, cursor:"pointer", fontSize:15, fontWeight:700,
    fontFamily:F_BODY, border:active?`2px solid ${C.grass}`:`1.5px solid ${C.line}`,
    background:active?"#e7f1ec":"#fff", color:C.ink };
}

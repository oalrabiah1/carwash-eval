import { useState, useEffect } from "react";

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxzWiHW1pApyGBQtlStifAuIDeBflA_ruERTdTUG7R7QxmI59oPwGGggojrnabA9a3h/exec";

const WORKERS = [
  { id: "w1", nameAr: "محمد ياسين", cars: ["نص", "وانيت", "لكسز أسود", "لكسز رمادي"] },
  { id: "w2", nameAr: "انصار",      cars: ["ماليبو", "باترول", "إنفينيتي"] },
  { id: "w3", nameAr: "نور جمال",   cars: ["فولكس واقن", "ميتسوبيشي", "اكسبدشن", "باجيرو"] },
  { id: "w4", nameAr: "ابو سيد",    cars: ["مرسيدس قديمة", "مرسيدس جديدة", "اكسبدشن أسود"] },
];

const SECTIONS = [
  { id:"exterior",   label:"النظافة الخارجية",       icon:"🚗", color:"#2563EB",
    criteria:["جسم السيارة نظيف — لا وساخة أو آثار صابون","الزجاج نظيف — لا خطوط أو بصمات","الإطارات والجنوط نظيفة","لا مناطق فائتة في الأجزاء السفلية","السيارة جُففت صح — لا بقع ماء"] },
  { id:"interior",   label:"النظافة الداخلية",       icon:"🪑", color:"#16A34A",
    criteria:["كل الأوساخ والمخلفات شُيلت من الداخل","الكراسي والسجاد نُظّفوا بالفاكيوم","الديكورات والتشطيبات مُمسحة ومُلمّعة","لوحة القيادة والأبواب والكونسول نظيفة","التعطير اتطبق صح — مو زيادة"] },
  { id:"tools",      label:"حالة الأدوات والتخزين",  icon:"🧰", color:"#D97706",
    criteria:["كل الأدوات موجودة — لا شيء ناقص","الإسفنج نظيف ومغسول وبدون روائح","الفوط نظيفة وجافة وبدون روائح","لا أدوات مبللة أو متروكة على الأرض","الأدوات مخزنة صح في مكانها المحدد","لا علامات سوء استخدام أو تلف في أي أداة"] },
  { id:"discipline", label:"الانضباط والتوقيت",      icon:"⏰", color:"#DC2626",
    criteria:["الشغل بدأ بوقته — بعد الفجر وقبل الساعة ٨","كل السيارات المسؤول عنها اتغسلت — لا شيء فات","الصور قبل وبعد اتبعثت على الواتساب","تم إبلاغ أصحاب السيارات قبل غسيل الداخلي (الاثنين)","العامل يتبع التعليمات بدون تذكير"] },
];

const SCORE_LABELS = {1:"ضعيف جداً",2:"ضعيف",3:"مقبول",4:"جيد",5:"ممتاز"};
const SCORE_COLORS = {1:"#DC2626",2:"#EA580C",3:"#CA8A04",4:"#2563EB",5:"#16A34A"};

const emptyScores = () => {
  const s = {};
  SECTIONS.forEach(sec => { s[sec.id]={}; sec.criteria.forEach((_,i) => { s[sec.id][i]=0; }); });
  return s;
};
const calcSec   = (scores,secId) => SECTIONS.find(s=>s.id===secId).criteria.reduce((sum,_,i)=>sum+(scores[secId]?.[i]||0),0);
const calcTotal = (scores) => SECTIONS.reduce((sum,sec)=>sum+calcSec(scores,sec.id),0);
const maxTotal  = () => SECTIONS.reduce((sum,sec)=>sum+sec.criteria.length*5,0);
const pct       = (scores) => Math.round((calcTotal(scores)/maxTotal())*100);
const sPct      = (scores,secId) => { const sec=SECTIONS.find(s=>s.id===secId); return Math.round((calcSec(scores,secId)/(sec.criteria.length*5))*100); };
const gradeOf   = (p) => p>=90?{label:"ممتاز",color:"#16A34A",bg:"#DCFCE7"}:p>=75?{label:"جيد",color:"#2563EB",bg:"#DBEAFE"}:p>=60?{label:"مقبول",color:"#CA8A04",bg:"#FEF9C3"}:p>=45?{label:"ضعيف",color:"#EA580C",bg:"#FFEDD5"}:{label:"ضعيف جداً",color:"#DC2626",bg:"#FEE2E2"};

const post = async (body) => {
  const r = await fetch(SCRIPT_URL,{method:"POST",body:JSON.stringify(body)});
  return r.json();
};
const get = async () => {
  const r = await fetch(SCRIPT_URL+"?t="+Date.now());
  return r.json();
};

export default function App() {
  const [page,           setPage]           = useState("home");
  const [evals,          setEvals]          = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [syncing,        setSyncing]        = useState(false);
  const [syncError,      setSyncError]      = useState("");
  const [worker,         setWorker]         = useState("w1");
  const [evalType,       setEvalType]       = useState("weekly");
  const [scores,         setScores]         = useState(emptyScores());
  const [notes,          setNotes]          = useState("");
  const [saved,          setSaved]          = useState(false);
  const [lastEntry,      setLastEntry]      = useState(null);
  const [activeSection,  setActiveSection]  = useState(0);

  useEffect(() => {
    get().then(res => {
      if (res.success) {
        setEvals((res.data||[]).map(row=>({
          id:row.ID, date:row.Date, workerName:row.Worker, evalType:row.Type,
          percentage:Number(row["Total%"])||0,
          exteriorPct:Number(row["Exterior%"])||0,
          interiorPct:Number(row["Interior%"])||0,
          toolsPct:Number(row["Tools%"])||0,
          disciplinePct:Number(row["Discipline%"])||0,
          grade:row.Grade, notes:row.Notes,
        })).reverse());
      }
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[]);

  const resetForm = () => { setScores(emptyScores());setNotes("");setSaved(false);setActiveSection(0);setWorker("w1");setSyncError(""); };

  const handleSave = async () => {
    setSyncing(true); setSyncError("");
    const wo = WORKERS.find(w=>w.id===worker);
    const p  = pct(scores);
    const g  = gradeOf(p);
    const entry = {
      id:Date.now(), date:new Date().toLocaleDateString("ar-SA"),
      workerName:wo.nameAr, evalType,
      exteriorPct:sPct(scores,"exterior"), interiorPct:sPct(scores,"interior"),
      toolsPct:sPct(scores,"tools"), disciplinePct:sPct(scores,"discipline"),
      percentage:p, grade:g.label, notes, scores,
    };
    try {
      const res = await post(entry);
      if (res.success) { setEvals(prev=>[entry,...prev]); setLastEntry(entry); setSaved(true); }
      else setSyncError("حصل خطأ في الحفظ، حاول مرة ثانية");
    } catch { setSyncError("تأكد من اتصال الإنترنت وحاول مرة ثانية"); }
    setSyncing(false);
  };

  const setScore = (secId,idx,val) => setScores(prev=>({...prev,[secId]:{...prev[secId],[idx]:val}}));
  const wo = WORKERS.find(w=>w.id===worker);
  const totalFilled = SECTIONS.every(sec=>sec.criteria.every((_,i)=>(scores[sec.id]?.[i]||0)>0));
  const sec = SECTIONS[activeSection];

  // ── HOME ──────────────────────────────────────────────────────────────────
  if (page==="home") return (
    <div style={St.root}>
      <div style={St.header}>
        <div style={{fontSize:52,marginBottom:6}}>🚗</div>
        <h1 style={{margin:0,fontSize:22,fontWeight:700,color:"#fff"}}>نظام تقييم الغسيل</h1>
        <p style={{margin:"4px 0 0",fontSize:13,color:"#93C5FD"}}>Car Wash Evaluation System</p>
      </div>

      {loading ? (
        <div style={St.empty}><div style={St.spinner}/>جاري تحميل البيانات من Google Sheets...</div>
      ) : (
        <div style={{padding:"16px 12px 0",display:"flex",flexDirection:"column",gap:10}}>
          {WORKERS.map(w=>{
            const we=evals.filter(e=>e.workerName===w.nameAr);
            const last=we[0]; const g=last?gradeOf(last.percentage):null;
            const avg=we.length?Math.round(we.reduce((s,e)=>s+e.percentage,0)/we.length):null;
            return (
              <div key={w.id} style={St.card}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:15}}>{w.nameAr}</div>
                    <div style={{color:"#9CA3AF",fontSize:12,marginTop:2}}>{w.cars.length} سيارات · {we.length} تقييم</div>
                  </div>
                  {g&&<div style={{...St.pill,background:g.bg,color:g.color,fontSize:18,padding:"6px 14px"}}>{last.percentage}%</div>}
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:10}}>
                  {w.cars.map(c=><span key={c} style={St.tag}>{c}</span>)}
                </div>
                {avg!==null&&(
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:10,fontSize:12,color:"#9CA3AF"}}>
                    <span>آخر تقييم: <b style={{color:"#E5E7EB"}}>{last.date}</b></span>
                    <span>المعدل: <b style={{color:gradeOf(avg).color}}>{avg}%</b></span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={{display:"flex",gap:10,padding:"16px 12px"}}>
        {[
          {label:"📝 تقييم جديد",bg:"#1D4ED8",fn:()=>{resetForm();setPage("form");}},
          {label:"📋 السجل",bg:"#15803D",fn:()=>setPage("history"),count:evals.length},
          {label:"📊 التقارير",bg:"#7C3AED",fn:()=>setPage("report")},
        ].map((b,i)=>(
          <button key={i} style={{...St.navBtn,background:b.bg}} onClick={b.fn}>
            <span style={{fontSize:22}}>{b.label.split(" ")[0]}</span>
            <span style={{fontSize:12}}>{b.label.split(" ").slice(1).join(" ")}</span>
            {b.count>0&&<span style={St.dot2}>{b.count}</span>}
          </button>
        ))}
      </div>
      <div style={{textAlign:"center",paddingBottom:8}}>
        <span style={{fontSize:12,color:"#34D399"}}>✅ البيانات محفوظة في Google Sheets</span>
      </div>
    </div>
  );

  // ── FORM ──────────────────────────────────────────────────────────────────
  if (page==="form") {
    if (saved&&lastEntry) {
      const g=gradeOf(lastEntry.percentage);
      return (
        <div style={St.root}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"40px 20px",gap:12}}>
            <div style={{fontSize:72}}>✅</div>
            <h2 style={{margin:0,fontSize:20,fontWeight:700}}>تم الحفظ في Google Sheets</h2>
            <div style={{color:"#9CA3AF"}}>{lastEntry.workerName}</div>
            <div style={{fontSize:52,fontWeight:700,color:g.color}}>{lastEntry.percentage}%</div>
            <div style={{...St.pill,background:g.bg,color:g.color,fontSize:16,padding:"8px 24px"}}>{g.label}</div>
            <div style={{background:"#1F2937",borderRadius:12,padding:14,width:"100%",marginTop:4}}>
              {[{icon:"🚗",label:"خارجي",val:lastEntry.exteriorPct,color:"#2563EB"},{icon:"🪑",label:"داخلي",val:lastEntry.interiorPct,color:"#16A34A"},{icon:"🧰",label:"أدوات",val:lastEntry.toolsPct,color:"#D97706"},{icon:"⏰",label:"انضباط",val:lastEntry.disciplinePct,color:"#DC2626"}].map(r=>(
                <div key={r.label} style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"7px 0",borderBottom:"1px solid #374151"}}>
                  <span>{r.icon} {r.label}</span>
                  <span style={{fontWeight:700,color:r.color}}>{r.val}%</span>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:10,marginTop:4}}>
              <button style={{...St.btn,background:"#1D4ED8"}} onClick={resetForm}>تقييم جديد</button>
              <button style={{...St.btn,background:"#374151"}} onClick={()=>setPage("home")}>الرئيسية</button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={St.root}>
        <div style={St.bar}>
          <button style={St.back} onClick={()=>setPage("home")}>← رجوع</button>
          <span style={{fontWeight:700,fontSize:15}}>تقييم جديد</span>
          <span style={{color:"#9CA3AF",fontSize:13}}>{activeSection+1}/{SECTIONS.length}</span>
        </div>

        {activeSection===0&&(
          <div style={{...St.card,margin:"12px 12px 0"}}>
            <label style={St.lbl}>اختر العامل</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {WORKERS.map(w=>(
                <button key={w.id} style={{...St.chip,...(worker===w.id?St.chipA:{})}} onClick={()=>setWorker(w.id)}>
                  <div style={{fontWeight:700,fontSize:13}}>{w.nameAr}</div>
                  <div style={{fontSize:11,color:worker===w.id?"#93C5FD":"#9CA3AF",marginTop:2}}>{w.cars.length} سيارات</div>
                </button>
              ))}
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:10}}>
              {wo.cars.map(c=><span key={c} style={St.tag}>{c}</span>)}
            </div>
            <label style={{...St.lbl,marginTop:14}}>نوع التقييم</label>
            <div style={{display:"flex",gap:8}}>
              {["weekly","monthly"].map(t=>(
                <button key={t} style={{...St.typeBtn,...(evalType===t?St.typeBtnA:{})}} onClick={()=>setEvalType(t)}>
                  {t==="weekly"?"📅 أسبوعي":"📆 شهري"}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{...St.secHdr,borderColor:sec.color,margin:"12px 12px 0"}}>
          <span style={{fontSize:22}}>{sec.icon}</span>
          <span style={{fontWeight:700,fontSize:15,color:sec.color,flex:1}}>{sec.label}</span>
          <span style={{fontWeight:700,fontSize:18,color:sec.color}}>{sPct(scores,sec.id)}%</span>
        </div>

        <div style={{padding:"8px 12px 0",display:"flex",flexDirection:"column",gap:8}}>
          {sec.criteria.map((criterion,idx)=>{
            const val=scores[sec.id]?.[idx]||0;
            return (
              <div key={idx} style={St.critRow}>
                <div style={{fontSize:13,color:"#E5E7EB",marginBottom:10,lineHeight:1.6}}>{criterion}</div>
                <div style={{display:"flex",gap:8,justifyContent:"center"}}>
                  {[1,2,3,4,5].map(n=>(
                    <button key={n} style={{...St.scoreBtn,background:val===n?SCORE_COLORS[n]:"#1F2937",color:val===n?"#fff":"#6B7280",border:val===n?`2px solid ${SCORE_COLORS[n]}`:"2px solid #374151",transform:val===n?"scale(1.18)":"scale(1)"}} onClick={()=>setScore(sec.id,idx,n)}>{n}</button>
                  ))}
                </div>
                {val>0&&<div style={{fontSize:11,fontWeight:600,textAlign:"center",marginTop:6,color:SCORE_COLORS[val]}}>{SCORE_LABELS[val]}</div>}
              </div>
            );
          })}
        </div>

        {activeSection===SECTIONS.length-1&&(
          <div style={{...St.card,margin:"12px 12px 0"}}>
            <label style={St.lbl}>ملاحظات إضافية (اختياري)</label>
            <textarea style={St.ta} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="اكتب أي ملاحظات هنا..." rows={3}/>
          </div>
        )}

        {syncError&&<div style={{margin:"10px 12px 0",background:"#FEE2E2",color:"#DC2626",borderRadius:10,padding:"10px 14px",fontSize:13}}>⚠ {syncError}</div>}

        <div style={{display:"flex",gap:10,padding:"16px 12px 0"}}>
          {activeSection>0&&<button style={{...St.btn,background:"#374151",flex:1}} onClick={()=>setActiveSection(s=>s-1)}>← السابق</button>}
          {activeSection<SECTIONS.length-1
            ?<button style={{...St.btn,background:sec.color,flex:2}} onClick={()=>setActiveSection(s=>s+1)}>التالي →</button>
            :<button style={{...St.btn,background:totalFilled&&!syncing?"#16A34A":"#374151",flex:2,opacity:totalFilled&&!syncing?1:0.5}} disabled={!totalFilled||syncing} onClick={handleSave}>{syncing?"⏳ جاري الحفظ...":"💾 حفظ في Google Sheets"}</button>
          }
        </div>

        <div style={{display:"flex",gap:6,justifyContent:"center",alignItems:"center",padding:"14px 0"}}>
          {SECTIONS.map((s,i)=>(
            <div key={i} style={{height:8,borderRadius:4,transition:"all .2s",background:i===activeSection?s.color:i<activeSection?"#4B5563":"#1F2937",width:i===activeSection?24:8}}/>
          ))}
        </div>
      </div>
    );
  }

  // ── HISTORY ───────────────────────────────────────────────────────────────
  if (page==="history") return (
    <div style={St.root}>
      <div style={St.bar}>
        <button style={St.back} onClick={()=>setPage("home")}>← رجوع</button>
        <span style={{fontWeight:700,fontSize:15}}>سجل التقييمات</span>
        <span style={{color:"#9CA3AF"}}>{evals.length}</span>
      </div>
      {loading&&<div style={St.empty}><div style={St.spinner}/>جاري التحميل...</div>}
      {!loading&&evals.length===0&&<div style={St.empty}>لا يوجد تقييمات بعد</div>}
      <div style={{padding:"8px 12px 0",display:"flex",flexDirection:"column",gap:10}}>
        {evals.map((e,i)=>{
          const g=gradeOf(e.percentage);
          return (
            <div key={i} style={St.card}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                <div>
                  <div style={{fontWeight:700,fontSize:15}}>{e.workerName}</div>
                  <div style={{color:"#9CA3AF",fontSize:12,marginTop:3}}>{e.date} · {e.evalType==="weekly"?"أسبوعي":"شهري"}</div>
                </div>
                <div style={{...St.pill,background:g.bg,color:g.color,fontSize:18,padding:"6px 14px"}}>{e.percentage}%</div>
              </div>
              {[{label:"🚗 خارجي",val:e.exteriorPct,color:"#2563EB"},{label:"🪑 داخلي",val:e.interiorPct,color:"#16A34A"},{label:"🧰 أدوات",val:e.toolsPct,color:"#D97706"},{label:"⏰ انضباط",val:e.disciplinePct,color:"#DC2626"}].map(r=>(
                <div key={r.label} style={{display:"flex",alignItems:"center",gap:8,fontSize:12,marginBottom:6}}>
                  <span style={{minWidth:72}}>{r.label}</span>
                  <div style={{flex:1,height:6,background:"#374151",borderRadius:3,overflow:"hidden"}}>
                    <div style={{height:"100%",borderRadius:3,width:`${r.val||0}%`,background:r.color}}/>
                  </div>
                  <span style={{color:r.color,fontWeight:700,minWidth:36}}>{r.val||0}%</span>
                </div>
              ))}
              {e.notes?<div style={{marginTop:8,fontSize:12,color:"#9CA3AF",background:"#374151",borderRadius:8,padding:"8px 10px"}}>📝 {e.notes}</div>:null}
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── REPORT ────────────────────────────────────────────────────────────────
  if (page==="report") return (
    <div style={St.root}>
      <div style={St.bar}>
        <button style={St.back} onClick={()=>setPage("home")}>← رجوع</button>
        <span style={{fontWeight:700,fontSize:15}}>تقرير الأداء</span>
      </div>
      <div style={{padding:"8px 12px 0",display:"flex",flexDirection:"column",gap:12}}>
        {WORKERS.map(w=>{
          const we=evals.filter(e=>e.workerName===w.nameAr);
          if(we.length===0) return (
            <div key={w.id} style={St.card}>
              <div style={{fontWeight:700,fontSize:16}}>{w.nameAr}</div>
              <div style={{color:"#6B7280",fontSize:13,marginTop:6}}>لا يوجد تقييمات بعد</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8}}>{w.cars.map(c=><span key={c} style={St.tag}>{c}</span>)}</div>
            </div>
          );
          const avg=Math.round(we.reduce((s,e)=>s+e.percentage,0)/we.length);
          const g=gradeOf(avg);
          const secs=[{icon:"🚗",label:"خارجي",key:"exteriorPct",color:"#2563EB"},{icon:"🪑",label:"داخلي",key:"interiorPct",color:"#16A34A"},{icon:"🧰",label:"أدوات",key:"toolsPct",color:"#D97706"},{icon:"⏰",label:"انضباط",key:"disciplinePct",color:"#DC2626"}];
          const sa=secs.map(s=>({...s,avg:Math.round(we.reduce((sum,e)=>sum+(e[s.key]||0),0)/we.length)}));
          const best=[...sa].sort((a,b)=>b.avg-a.avg)[0];
          const worst=[...sa].sort((a,b)=>a.avg-b.avg)[0];
          return (
            <div key={w.id} style={St.card}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                <div>
                  <div style={{fontWeight:700,fontSize:16}}>{w.nameAr}</div>
                  <div style={{color:"#9CA3AF",fontSize:12,marginTop:3}}>{we.length} تقييم</div>
                </div>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:30,fontWeight:700,color:g.color}}>{avg}%</div>
                  <div style={{...St.pill,background:g.bg,color:g.color}}>{g.label}</div>
                </div>
              </div>
              {sa.map(s=>(
                <div key={s.key} style={{display:"flex",alignItems:"center",gap:8,fontSize:12,marginBottom:8}}>
                  <span style={{minWidth:80}}>{s.icon} {s.label}</span>
                  <div style={{flex:1,height:8,background:"#374151",borderRadius:4,overflow:"hidden"}}>
                    <div style={{height:"100%",borderRadius:4,width:`${s.avg}%`,background:s.color}}/>
                  </div>
                  <span style={{color:s.color,fontWeight:700,minWidth:40,textAlign:"right"}}>{s.avg}%</span>
                </div>
              ))}
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8}}>{w.cars.map(c=><span key={c} style={St.tag}>{c}</span>)}</div>
              <div style={{display:"flex",flexDirection:"column",gap:4,marginTop:12,fontSize:12,fontWeight:600}}>
                <span style={{color:"#16A34A"}}>✅ أقوى نقطة: {best.icon} {best.label} ({best.avg}%)</span>
                <span style={{color:"#DC2626"}}>⚠ تحتاج تحسين: {worst.icon} {worst.label} ({worst.avg}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const St = {
  root:    {minHeight:"100vh",background:"#111827",color:"#F9FAFB",fontFamily:"'Segoe UI',Tahoma,sans-serif",direction:"rtl",maxWidth:500,margin:"0 auto",paddingBottom:40},
  header:  {background:"linear-gradient(135deg,#1D4ED8,#1E40AF)",padding:"32px 20px 24px",textAlign:"center"},
  card:    {background:"#1F2937",borderRadius:12,padding:14,border:"1px solid #374151"},
  pill:    {borderRadius:20,padding:"4px 12px",fontWeight:700,fontSize:14,display:"inline-block"},
  tag:     {background:"#374151",color:"#D1D5DB",fontSize:11,padding:"3px 8px",borderRadius:10},
  navBtn:  {flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6,padding:"14px 8px",borderRadius:12,border:"none",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",position:"relative"},
  dot2:    {position:"absolute",top:8,left:8,background:"#EF4444",color:"#fff",fontSize:11,fontWeight:700,padding:"1px 6px",borderRadius:10},
  bar:     {display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",background:"#1F2937",borderBottom:"1px solid #374151"},
  back:    {background:"none",border:"none",color:"#60A5FA",fontSize:14,cursor:"pointer",fontWeight:600},
  lbl:     {display:"block",color:"#9CA3AF",fontSize:12,fontWeight:600,marginBottom:8},
  chip:    {background:"#374151",border:"2px solid #4B5563",borderRadius:10,padding:"8px 12px",cursor:"pointer",textAlign:"right",color:"#D1D5DB",minWidth:110},
  chipA:   {background:"#1D4ED8",border:"2px solid #3B82F6",color:"#fff"},
  typeBtn: {flex:1,padding:"10px",background:"#374151",border:"2px solid #4B5563",borderRadius:10,color:"#D1D5DB",fontSize:13,cursor:"pointer",fontWeight:600},
  typeBtnA:{background:"#7C3AED",borderColor:"#8B5CF6",color:"#fff"},
  secHdr:  {display:"flex",alignItems:"center",gap:10,padding:"12px 16px",background:"#1F2937",borderRadius:12,borderRight:"4px solid"},
  critRow: {background:"#1F2937",borderRadius:10,padding:"12px 14px"},
  scoreBtn:{width:40,height:40,borderRadius:10,fontWeight:700,fontSize:15,cursor:"pointer",transition:"all .15s"},
  ta:      {width:"100%",background:"#374151",border:"1px solid #4B5563",borderRadius:8,color:"#F9FAFB",fontSize:13,padding:10,resize:"none",boxSizing:"border-box"},
  btn:     {padding:"14px",borderRadius:12,border:"none",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer"},
  empty:   {textAlign:"center",color:"#6B7280",padding:"48px 20px",fontSize:15,display:"flex",flexDirection:"column",alignItems:"center",gap:12},
  spinner: {width:32,height:32,border:"3px solid #374151",borderTop:"3px solid #3B82F6",borderRadius:"50%",animation:"spin 1s linear infinite"},
};

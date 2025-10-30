
"use client";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import BarcodeDialog from "@/components/BarcodeDialog";
import { AuthButtons } from "@/components/AuthClient";
import { logEvent } from "@/lib/analytics";

const fmt = (n:number) => Math.round(n);
const todayKey = () => new Date().toISOString().slice(0,10);

const starterFavorites = [
  { name: "Greek yogurt + berries", calories: 220, protein: 20 },
  { name: "Turkey sandwich", calories: 420, protein: 28 },
  { name: "Protein shake", calories: 180, protein: 24 },
  { name: "Family spaghetti (1 cup)", calories: 320, protein: 14 },
];

export default function Page() {
  const [target, setTarget] = useState(1800);
  const [proteinTarget, setProteinTarget] = useState(90);
  const [water, setWater] = useState(0);
  const [mood, setMood] = useState(3);
  const [familyMode, setFamilyMode] = useState(false);
  const [portions, setPortions] = useState(1);
  const [entries, setEntries] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [mission, setMission] = useState("Track breakfast every day this week");
  const [badges, setBadges] = useState<any[]>([]);
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [health, setHealth] = useState<{steps:number, exerciseCalories:number} | null>(null);

  useEffect(() => { fetch("/api/entries").then(r=>r.json()).then(d=>setEntries(d.entries||[])).catch(()=>{}); }, []);
  useEffect(() => { fetch("/api/health").then(r=>r.json()).then(setHealth).catch(()=>{}); }, []);

  // Load server favorites
  useEffect(() => {
    fetch("/api/favorites").then(r => r.status===401?{favorites:[]} : r.json()).then((d:any)=>setFavorites(d.favorites||starterFavorites)).catch(()=>setFavorites(starterFavorites));
  }, []);

  async function createFavorite(f:any){
    const res = await fetch("/api/favorites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    if (!res.ok) return;
    const created = await res.json();
    setFavorites(prev => [created, ...prev]);
  }
  async function updateFavorite(id:string, patch:any){
    const res = await fetch("/api/favorites", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...patch }) });
    if (!res.ok) return;
    const upd = await res.json();
    setFavorites(prev => prev.map(x => x.id === id ? upd : x));
  }
  async function deleteFavorite(id:string){
    await fetch("/api/favorites", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setFavorites(prev => prev.filter(x => x.id !== id));
  }

  const totals = useMemo(() => {
    const cals = entries.reduce((s,e)=>s+e.calories,0);
    const prot = entries.reduce((s,e)=>s+(e.protein||0),0);
    return { calories: cals, protein: prot };
  }, [entries]);

  const remaining = Math.max(0, target - totals.calories);
  const proteinRemaining = Math.max(0, proteinTarget - totals.protein);

  useEffect(() => {
    const wonBreakfast = entries.some(e => e.meal === "Breakfast");
    const withinRange = totals.calories <= target + 100;
    const hydrated = water >= 8;
    const newBadges:any[] = [];
    if (wonBreakfast) newBadges.push({ key: "breakfast", label: "Logged Breakfast", icon: "🥣" });
    if (withinRange) newBadges.push({ key: "ontrack", label: "On Track Today", icon: "✅" });
    if (hydrated) newBadges.push({ key: "water", label: "8 Cups of Water", icon: "💧" });
    const keys = new Set(badges.map(b=>b.key));
    const merged = [...badges];
    newBadges.forEach(b => { if (!keys.has(b.key)) merged.push(b); });
    if (merged.length !== badges.length) setBadges(merged);
  }, [entries, target, totals.calories, water]);

  async function addEntry(data:any){
    const res = await fetch("/api/entries", { method: "POST", body: JSON.stringify(data) });
    const e = await res.json();
    setEntries(prev => [e, ...prev]);
  }
  async function removeEntry(id:string){
    await fetch("/api/entries", { method: "DELETE", body: JSON.stringify({ id }) });
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  function famAdj(value:number){ return familyMode ? Math.round(value * (portions||1)) : value; }
  function inferMeal(){
    const h = new Date().getHours();
    if (h < 11) return "Breakfast";
    if (h < 16) return "Lunch";
    if (h < 21) return "Dinner";
    return "Snacks";
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      <header style={{ position: "sticky", top: 0, background: "rgba(255,255,255,.7)", backdropFilter: "blur(8px)", borderBottom: "1px solid #e5e7eb", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", padding: 12, gap: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 22 }}>Small Wins</span>
          <span style={{ marginLeft: "auto" }}><AuthButtons/></span>
        </div>
      </header>

      <main style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, marginTop: 16 }}>
        <section style={{ display: "grid", gap: 16 }}>
          <Summary target={target} proteinTarget={proteinTarget} totals={totals} remaining={remaining} proteinRemaining={proteinRemaining} health={health} />
          <QuickActions favorites={favorites} onQuickAdd={(fav:any)=>addEntry({ name: fav.name, calories: famAdj(fav.calories), protein: famAdj(fav.protein||0), meal: inferMeal() })}
            onCreateFavorite={createFavorite} onUpdateFavorite={updateFavorite} onDeleteFavorite={deleteFavorite} />
          <MealLogger onAdd={(e:any)=>addEntry(e)} familyMode={familyMode} portions={portions} />
          <BarcodeDialog open={barcodeOpen} onClose={()=>setBarcodeOpen(false)} onUse={(item:any)=>addEntry({ name: item.name, calories: famAdj(item.calories), protein: famAdj(item.protein||0), meal: inferMeal() })} />
          <EntriesList entries={entries} onRemove={removeEntry} onOpenBarcode={()=>setBarcodeOpen(true)} />
        </section>
        <aside style={{ display: "grid", gap: 16 }}>
          <Coach totals={totals} target={target} proteinTarget={proteinTarget} remaining={remaining} />
          <Wellness water={water} setWater={setWater} mood={mood} setMood={setMood} />
          <Settings target={target} setTarget={setTarget} proteinTarget={proteinTarget} setProteinTarget={setProteinTarget} familyMode={familyMode} setFamilyMode={setFamilyMode} portions={portions} setPortions={setPortions} />
          <Missions mission={mission} setMission={setMission} badges={badges} />
          <HealthCard health={health} />
        </aside>
      </main>

      <footer style={{ textAlign: "center", padding: 24, fontSize: 12, color: "#64748b" }}>
        Built for busy parents & beginners. Celebrate progress, not perfection.
      </footer>
    </div>
  );
}

function Summary({ target, proteinTarget, totals, remaining, proteinRemaining, health }:any){
  const pct = Math.min(100, (totals.calories / target) * 100 || 0);
  const color = pct < 80 ? "#10b981" : pct <= 110 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, background: "white", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{fmt(totals.calories)} / {target} kcal</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>{fmt(remaining)} kcal remaining</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 700 }}>Protein {fmt(totals.protein)} / {proteinTarget}g</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>{fmt(proteinRemaining)}g to go</div>
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <div style={{ height: 8, borderRadius: 8, background: "#e2e8f0" }}>
          <div style={{ width: pct + "%", height: 8, borderRadius: 8, background: color }} />
        </div>
        <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: "#64748b" }}>
          <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 999, background: color }} />
          <span>Green = on track • Amber = close • Red = over</span>
        </div>
      </div>
      {health && (
        <div style={{ marginTop: 12, fontSize: 12, color: "#334155" }}>
          Health sync: {health.steps?.toLocaleString()} steps · {health.exerciseCalories} exercise kcal (mock)
        </div>
      )}
    </div>
  );
}

function QuickActions({ favorites, onQuickAdd, onCreateFavorite, onUpdateFavorite, onDeleteFavorite }:any){
  const [favName, setFavName] = useState("");
  const [favCal, setFavCal] = useState("");
  const [favProt, setFavProt] = useState("");
  const [editing, setEditing] = useState<any | null>(null);

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, background: "white", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 700 }}>Quick Add & Favorites</div>
        <div style={{ fontSize: 12, color: "#64748b" }}>Save go-tos for one-tap logging</div>
      </div>

      {/* Create new favorite */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", marginTop: 8 }}>
        <div style={{ display: "grid" }}>
          <label style={{ fontSize: 12, color: "#64748b" }}>Name</label>
          <input value={favName} onChange={e=>setFavName(e.target.value)} placeholder="e.g., Chicken bowl" style={{ padding: 8, borderRadius: 8, border: "1px solid #e5e7eb" }}/>
        </div>
        <div style={{ display: "grid" }}>
          <label style={{ fontSize: 12, color: "#64748b" }}>kcal</label>
          <input type="number" value={favCal} onChange={e=>setFavCal(e.target.value)} style={{ padding: 8, width: 100, borderRadius: 8, border: "1px solid #e5e7eb" }}/>
        </div>
        <div style={{ display: "grid" }}>
          <label style={{ fontSize: 12, color: "#64748b" }}>Protein g</label>
          <input type="number" value={favProt} onChange={e=>setFavProt(e.target.value)} style={{ padding: 8, width: 100, borderRadius: 8, border: "1px solid #e5e7eb" }}/>
        </div>
        <button onClick={()=>{
          if(!favName || !favCal) return;
          onCreateFavorite({ name: favName, calories: Number(favCal), protein: Number(favProt||0) });
      logEvent("favorite_added", { name: favName });
          setFavName(""); setFavCal(""); setFavProt("");
        }} style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#f8fafc" }}>Save Favorite</button>
      </div>

      {/* Favorites grid */}
      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fill, minmax(240px,1fr))", marginTop: 12 }}>
        {favorites.map((f:any) => (
          <div key={f.id||f.name} style={{ textAlign: "left", padding: 12, borderRadius: 12, border: "1px solid #e5e7eb", background: "white", display:"grid", gap:6 }}>
            {editing?.id === f.id ? (
              <div style={{ display: "grid", gap: 6 }}>
                <input value={editing.name} onChange={e=>setEditing({...editing, name: e.target.value})} style={{ padding: 8, borderRadius: 8, border: "1px solid #e5e7eb" }}/>
                <div style={{ display: "flex", gap: 6 }}>
                  <input type="number" value={editing.calories} onChange={e=>setEditing({...editing, calories: Number(e.target.value)})} style={{ padding: 8, borderRadius: 8, border: "1px solid #e5e7eb", width:100 }}/>
                  <input type="number" value={editing.protein||0} onChange={e=>setEditing({...editing, protein: Number(e.target.value)})} style={{ padding: 8, borderRadius: 8, border: "1px solid #e5e7eb", width:100 }}/>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={()=>{ onUpdateFavorite(editing.id, { name: editing.name, calories: editing.calories, protein: editing.protein||0 }); setEditing(null); }} style={{ padding:"6px 10px", borderRadius: 10, border:"1px solid #e5e7eb", background:"#f0fdf4" }}>Save</button>
                  <button onClick={()=>setEditing(null)} style={{ padding:"6px 10px", borderRadius: 10, border:"1px solid #e5e7eb", background:"#fff" }}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ fontWeight: 600 }}>{f.name}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{Math.round(f.calories)} kcal · {Math.round(f.protein||0)}g protein</div>
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <button onClick={()=>onQuickAdd(f)} style={{ padding:"6px 10px", borderRadius: 10, border:"1px solid #e5e7eb", background:"#f8fafc" }}>Add</button>
                  {"id" in f && <button onClick={()=>setEditing(f)} style={{ padding:"6px 10px", borderRadius: 10, border:"1px solid #e5e7eb", background:"#fff" }}>Edit</button>}
                  {"id" in f && <button onClick={()=>onDeleteFavorite(f.id)} style={{ padding:"6px 10px", borderRadius: 10, border:"1px solid #fee2e2", background:"#fef2f2", color:"#b91c1c" }}>Delete</button>}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MealLogger({ onAdd, familyMode, portions }:any){
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [meal, setMeal] = useState("Breakfast");
  const [photoEst, setPhotoEst] = useState<any>(null);
  function famAdj(v:number){ return familyMode ? Math.round(v*(portions||1)) : v; }
  function handleAdd(){
    if (!name || !calories) return;
    onAdd({ name, calories: famAdj(Number(calories)), protein: famAdj(Number(protein||0)), meal });
    setName(""); setCalories(""); setProtein(""); setPhotoEst(null);
  }
  async function fileToBase64(file: File): Promise<string>{
    const buf = await file.arrayBuffer();
    let binary = ''; const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }
  async function photoEstimate(file: File | null){
    if(!file) return;
    try {
      const base64 = await fileToBase64(file);
      const res = await fetch("/api/vision", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageBase64: base64 }) });
      if (!res.ok) throw new Error("vision error");
      const d = await res.json();
      setPhotoEst({ calories: d.calories, protein: d.protein||0 });
      setName(d.name);
      setCalories(String(d.calories));
      setProtein(String(d.protein||0));
    } catch {
      const base = 300 + Math.round(Math.random()*300);
      const prot = 10 + Math.round(Math.random()*20);
      setPhotoEst({ calories: base, protein: prot });
      setName(file.name.replace(/\.[^.]+$/, ""));
      setCalories(String(base)); setProtein(String(prot));
    }
  }
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, background: "white", padding: 16 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Log a Meal</div>
      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr" }}>
        <div style={{ display: "grid" }}>
          <label style={{ fontSize: 12, color: "#64748b" }}>Meal</label>
          <select value={meal} onChange={e=>setMeal(e.target.value)} style={{ padding: 8, borderRadius: 8, border: "1px solid #e5e7eb" }}>
            {["Breakfast","Lunch","Dinner","Snacks"].map(m=> <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div style={{ display: "grid" }}>
          <label style={{ fontSize: 12, color: "#64748b" }}>Name</label>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g., Oatmeal with banana" style={{ padding: 8, borderRadius: 8, border: "1px solid #e5e7eb" }}/>
        </div>
        <div style={{ display: "grid" }}>
          <label style={{ fontSize: 12, color: "#64748b" }}>kcal</label>
          <input type="number" value={calories} onChange={e=>setCalories(e.target.value)} style={{ padding: 8, borderRadius: 8, border: "1px solid #e5e7eb" }}/>
        </div>
        <div style={{ display: "grid" }}>
          <label style={{ fontSize: 12, color: "#64748b" }}>Protein g</label>
          <input type="number" value={protein} onChange={e=>setProtein(e.target.value)} style={{ padding: 8, borderRadius: 8, border: "1px solid #e5e7eb" }}/>
        </div>
        <div style={{ display: "grid", alignContent: "end" }}>
          <button onClick={handleAdd} style={{ padding: "10px 14px", borderRadius: 12, background: "#0ea5e9", color: "white", border: "none" }}>Add</button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
        <label style={{ fontSize: 14, cursor: "pointer" }}>
          <input type="file" accept="image/*" onChange={(e)=>photoEstimate(e.target.files?.[0]||null)} style={{ display: "none" }}/>
          📷 Snap & Log (vision)
        </label>
        <button onClick={()=>{ setName("Turkey wrap"); setCalories("390"); setProtein("28"); }} style={{ padding: "8px 12px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#f8fafc" }}>✨ Suggest a meal</button>
      </div>
      {photoEst && <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 10, padding: 12, borderRadius: 12, background: "#eff6ff", border: "1px solid #bfdbfe", fontSize: 14 }}>Estimated {fmt(photoEst.calories)} kcal · {fmt(photoEst.protein)}g protein — adjust if needed and tap Add.</motion.div>}
    </div>
  );
}

function EntriesList({ entries, onRemove, onOpenBarcode }:any){
  const grouped = entries.reduce((acc:any, e:any)=>{ acc[e.meal] = acc[e.meal] || []; acc[e.meal].push(e); return acc; }, {} as Record<string, any[]>);
  const order = ["Breakfast","Lunch","Dinner","Snacks"];
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, background: "white", padding: 16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontWeight: 700 }}>Today’s Log</div>
        <button onClick={onOpenBarcode} style={{ padding: "8px 12px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#f8fafc" }}>🧾 Scan barcode</button>
      </div>
      <div style={{ display: "grid", gap: 12, marginTop: 8 }}>
        {order.map(m => (
          <div key={m}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>{m}</div>
            <div style={{ display: "grid", gap: 8 }}>
              {(grouped[m]||[]).length === 0 && <div style={{ fontSize: 12, color: "#64748b" }}>No entries yet.</div>}
              {(grouped[m]||[]).map(e => (
                <div key={e.id} style={{ display:"flex", justifyContent:"space-between", padding: 12, borderRadius: 12, border: "1px solid #e5e7eb", background: "white" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{e.name}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{fmt(e.calories)} kcal · {fmt(e.protein||0)}g protein</div>
                  </div>
                  <button onClick={()=>onRemove(e.id)} style={{ border: "none", background: "transparent", color: "#ef4444" }}>Remove</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Coach({ totals, target, proteinTarget, remaining }:any){
  const tips = (()=>{
    const arr:string[] = [];
    if (totals.protein < proteinTarget * 0.6) arr.push("Try a protein-forward snack this afternoon (Greek yogurt, eggs, tuna).");
    if (remaining < 250 && remaining > 0) arr.push("You’re close to your target — plan a lighter dinner portion.");
    if (totals.calories < target * 0.4) arr.push("Great pace! A balanced lunch keeps evening cravings down.");
    if (arr.length === 0) arr.push("Nice work staying consistent — small wins compound.");
    return arr.slice(0, 2);
  })();
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, background: "white", padding: 16 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Smart Coach</div>
      {tips.map((t,i)=>(<div key={i} style={{ padding: 12, borderRadius: 12, background: "#ecfdf5", border: "1px solid #a7f3d0", fontSize: 14 }}>{t}</div>))}
      <div style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>Beginner-friendly guidance, not guilt.</div>
    </div>
  );
}

function Wellness({ water, setWater, mood, setMood }:any){
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, background: "white", padding: 16 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Water & Mood</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 600 }}>Water</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>Goal: 8 cups</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={()=>setWater(Math.max(0, water-1))} style={{ padding:"6px 10px", borderRadius: 12, border: "1px solid #e5e7eb" }}>-</button>
          <div style={{ width: 40, textAlign: "center", fontWeight: 700 }}>{water}</div>
          <button onClick={()=>setWater(water+1)} style={{ padding:"6px 10px", borderRadius: 12, border: "1px solid #e5e7eb" }}>+</button>
        </div>
      </div>
      <div style={{ height: 1, background: "#e5e7eb", margin: "12px 0" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 600 }}>Mood</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>How do you feel after meals?</div>
        </div>
        <select value={String(mood)} onChange={e=>setMood(Number(e.target.value))} style={{ padding: 8, borderRadius: 8, border: "1px solid #e5e7eb" }}>
          <option value="1">😣 Low</option>
          <option value="2">☁️ Meh</option>
          <option value="3">🙂 Okay</option>
          <option value="4">😊 Good</option>
          <option value="5">💪 Great</option>
        </select>
      </div>
    </div>
  );
}

function Settings({ target, setTarget, proteinTarget, setProteinTarget, familyMode, setFamilyMode, portions, setPortions }:any){
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, background: "white", padding: 16 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Settings</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div style={{ display: "grid" }}>
          <label style={{ fontSize: 12, color: "#64748b" }}>Daily calories</label>
          <input type="number" value={target} onChange={e=>setTarget(Number(e.target.value||0))} style={{ padding: 8, borderRadius: 8, border: "1px solid #e5e7eb" }}/>
        </div>
        <div style={{ display: "grid" }}>
          <label style={{ fontSize: 12, color: "#64748b" }}>Protein target (g)</label>
          <input type="number" value={proteinTarget} onChange={e=>setProteinTarget(Number(e.target.value||0))} style={{ padding: 8, borderRadius: 8, border: "1px solid #e5e7eb" }}/>
        </div>
      </div>
      <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12, borderRadius: 12, border: "1px solid #e5e7eb" }}>
          <div>
            <div style={{ fontWeight: 600 }}>Family Mode</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Adjusts logging to your portion when cooking for the family.</div>
          </div>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <input type="checkbox" checked={familyMode} onChange={e=>setFamilyMode(e.target.checked)}/>
            {familyMode ? "On" : "Off"}
          </label>
        </div>
        {familyMode && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div>Portions you’re eating</div>
            <select value={String(portions)} onChange={e=>setPortions(Number(e.target.value))} style={{ padding: 8, borderRadius: 8, border: "1px solid #e5e7eb" }}>
              {[0.5,1,1.5,2,3].map(p=>(<option key={p} value={String(p)}>{p}×</option>))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

function Missions({ mission, setMission, badges }:any){
  const [val, setVal] = useState(mission);
  useEffect(()=>setVal(mission), [mission]);
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, background: "white", padding: 16 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Small Wins</div>
      <div style={{ fontSize: 14 }}>Weekly Mission: <span style={{ fontWeight: 600 }}>{mission}</span></div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        {badges.length === 0 && <div style={{ fontSize: 12, color: "#64748b" }}>No badges yet — you’ve got this!</div>}
        {badges.map((b:any)=> <span key={b.key} style={{ padding: "6px 10px", borderRadius: 999, background: "#ede9fe", border: "1px solid #ddd6fe", fontSize: 12 }}>{b.icon} {b.label}</span>)}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input value={val} onChange={e=>setVal(e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 8, border: "1px solid #e5e7eb" }}/>
        <button onClick={()=>setMission(val)} style={{ padding: "8px 12px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#f8fafc" }}>Save</button>
      </div>
    </div>
  );
}

function HealthCard({ health }:any){
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, background: "white", padding: 16 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Health Integrations (stub)</div>
      <div style={{ fontSize: 14, color: "#334155" }}>Apple Health / Google Fit</div>
      <div style={{ fontSize: 12, color: "#64748b" }}>Currently mocked via `/api/health` (toggle with env var).</div>
      <div style={{ marginTop: 8, fontSize: 14 }}>{health ? `Steps: ${health.steps?.toLocaleString()} · Exercise kcal: ${health.exerciseCalories}` : "Loading…"}</div>
      <div style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>In production, use native bridges (iOS/Android) or OAuth providers to fetch steps/exercise.</div>
    </div>
  );
}

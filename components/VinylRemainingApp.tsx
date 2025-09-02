'use client';
import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Vinyl Remaining Web App — Single-file React component
 * Design goals: Apple-like minimalism, calm visual hierarchy, soft glass cards,
 * light/dark mode, unit switching (in ⟷ mm), thickness presets modal,
 * quick core buttons, instant calculations, history with CSV export & search.
 */

// --- Tiny utilities ---------------------------------------------------------
const IN_PER_MM = 1 / 25.4;
const MM_PER_IN = 25.4;

const round = (v: number, d = 3) => {
  const p = Math.pow(10, d);
  return Math.round((Number.isFinite(v) ? v : 0) * p) / p;
};

const fmt = (v: number | undefined, d = 2) => new Intl.NumberFormat(undefined, { maximumFractionDigits: d }).format(v ?? 0);

const toInches = (v: number, unit: string) => (unit === "mm" ? v * IN_PER_MM : v);
const toMM = (v: number, unit: string) => (unit === "in" ? v * MM_PER_IN : v);

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

// --- Local storage helpers --------------------------------------------------
const store = {
  get<T>(key: string, fallback: T): T {
    try {
      // @ts-ignore
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) as T : fallback;
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },
};

// --- Modal (simple, self-contained) ----------------------------------------
function Modal({ open, onClose, title, children, isDark }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; isDark: boolean; }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" aria-modal="true" role="dialog">
      <div className={cx("absolute inset-0 backdrop-blur-sm", isDark ? "bg-black/40" : "bg-black/20")} onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className={cx("w-full max-w-lg rounded-2xl border", isDark ? "bg-neutral-900/95 border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)]" : "bg-white border-black/10 shadow-2xl")}> 
          <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/10">
            <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
            <button
              className={cx("px-3 py-1.5 rounded-xl text-sm", isDark ? "bg-white/10 hover:bg-white/15" : "bg-black/5 hover:bg-black/10 shadow-sm")}
              onClick={onClose}
            >
              Close
            </button>
          </div>
          <div className="p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

// --- Brand / Logo -----------------------------------------------------------
function BrandMark({ logoUrl, isDark }: { logoUrl: string | null; isDark: boolean; }) {
  const box = cx(
    "w-12 h-12 rounded-2xl overflow-hidden border grid place-items-center select-none",
    isDark ? "border-white/15 bg-white/5" : "border-black/10 bg-white shadow-md"
  );

  if (logoUrl) {
    return <img src={logoUrl} alt="Logo" className={cx(box, "object-cover object-center")} />;
  }
  // Placeholder — swap later by setting `logoUrl` in state/localStorage.
  return (
    <div className={box} aria-label="Logo placeholder">
      <span className={isDark ? "text-white/60" : "text-black/50"} style={{fontSize: 10, letterSpacing: "0.12em"}}>YOUR LOGO</span>
    </div>
  );
}

// --- CSV helper -------------------------------------------------------------
function toCSV(rows: any[]) {
  const header = ["Saved At", "Name", "Unit", "OD", "ID", "Thickness", "Length_in", "Length_ft", "Length_m", "Length_yd"]; // prettier-ignore
  const data = rows.map((r) => [
    new Date(r.savedAt).toISOString(),
    r.name || "",
    r.unit,
    r.od,
    r.id,
    r.thickness,
    r.lengthIn,
    r.lengthFt,
    r.lengthM,
    r.lengthYd,
  ]);
  const csv = [header, ...data]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  return csv;
}

// --- Main App ---------------------------------------------------------------
export default function VinylRemainingApp() {
  const [unit, setUnit] = useState(() => store.get("vinylCalc.unit", "in")); // "in" | "mm"
  const [theme, setTheme] = useState<"light" | "dark" | "auto">(() => store.get("vinylCalc.theme", "auto")); // "light" | "dark" | "auto"

  // Inputs in CURRENT unit
  const [od, setOd] = useState<number>(() => store.get("vinylCalc.od", 6));
  const [id, setId] = useState<number>(() => {
    const saved = store.get("vinylCalc.id", null as any);
    if (saved !== null && saved !== undefined) return saved;
    return unit === "mm" ? 85 : round(85 * IN_PER_MM, 3);
  });
  const [thickness, setThickness] = useState<number>(() => store.get("vinylCalc.thickness", unit === "mm" ? 0.076 : 0.003));

  const [showPresetModal, setShowPresetModal] = useState(false);
  const [presets, setPresets] = useState(() => store.get("vinylCalc.presets", [
    { name: "Calendared 3 mil", thicknessIn: 0.003 },
    { name: "Cast 2 mil", thicknessIn: 0.002 },
    { name: "Laminate 1.5 mil", thicknessIn: 0.0015 },
    { name: "100 μm film", thicknessIn: 0.1 * IN_PER_MM },
  ]));

  const [savedRolls, setSavedRolls] = useState<any[]>(() => store.get("vinylCalc.savedRolls", []));
  const [search, setSearch] = useState("");
  const nameRef = useRef<HTMLInputElement | null>(null);
  // Brand logo URL (data URL or https). Stored in localStorage so you can swap later easily.
  const [logoUrl, setLogoUrl] = useState<string | null>(() => store.get("vinylCalc.logoUrl", null));

  // Persist on change
  useEffect(() => store.set("vinylCalc.unit", unit), [unit]);
  useEffect(() => store.set("vinylCalc.theme", theme), [theme]);
  useEffect(() => store.set("vinylCalc.od", od), [od]);
  useEffect(() => store.set("vinylCalc.id", id), [id]);
  useEffect(() => store.set("vinylCalc.thickness", thickness), [thickness]);
  useEffect(() => store.set("vinylCalc.presets", presets), [presets]);
  useEffect(() => store.set("vinylCalc.savedRolls", savedRolls), [savedRolls]);
  useEffect(() => store.set("vinylCalc.logoUrl", logoUrl), [logoUrl]);

  // Theme handling
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const mq = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    const compute = () => setIsDark(theme === 'dark' || (theme === 'auto' && !!mq && mq.matches));
    compute();
    // @ts-ignore optional chaining compatibility
    mq?.addEventListener?.('change', compute);
    return () => {
      // @ts-ignore
      mq?.removeEventListener?.('change', compute);
    };
  }, [theme]);

  const cardClass = cx('rounded-3xl border backdrop-blur p-5 shadow-sm', isDark ? 'border-white/10 bg-neutral-900/60' : 'border-black/5 bg-white/70');
  const inputClass = cx('w-full px-3 py-2 rounded-xl border focus:outline-none', isDark ? 'border-white/10 bg-neutral-800 focus:ring-2 focus:ring-white/20' : 'border-black/10 bg-white/90 focus:ring-2 focus:ring-black/20');
  const mutedText = isDark ? 'text-neutral-400' : 'text-neutral-600';

  // Keyboard shortcuts: / focus search, s save, t presets
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || (target as any).isContentEditable)) return;
      if (e.key === "/") {
        e.preventDefault();
        const el = document.getElementById("search-input") as HTMLInputElement | null;
        el?.focus();
      } else if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        nameRef.current?.focus();
      } else if (e.key.toLowerCase() === "t") {
        e.preventDefault();
        setShowPresetModal(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Convert on unit switch
  const toggleUnit = (nextUnit: "in" | "mm") => {
    if (nextUnit === unit) return;
    if (nextUnit === "mm") {
      setOd(round(toMM(od, "in"), 3));
      setId(round(toMM(id, "in"), 3));
      setThickness(round(toMM(thickness, "in"), 4));
    } else {
      setOd(round(toInches(od, "mm"), 3));
      setId(round(toInches(id, "mm"), 3));
      setThickness(round(toInches(thickness, "mm"), 5));
    }
    setUnit(nextUnit);
  };

  // Calculation (always in inches internally)
  const calc = useMemo(() => {
    const odIn = toInches(od, unit);
    const idIn = toInches(id, unit);
    const tIn = toInches(thickness, unit);

    const valid = odIn > idIn && tIn > 0;
    if (!valid) return { valid, message: "Check that OD > ID and thickness > 0" };

    const lengthIn = (Math.PI * (odIn * odIn - idIn * idIn)) / (4 * tIn);
    const lengthFt = lengthIn / 12;
    const lengthYd = lengthIn / 36;
    const lengthM = lengthIn * 0.0254;

    return { valid, lengthIn, lengthFt, lengthYd, lengthM };
  }, [od, id, thickness, unit]);

  const applyPreset = (p: { name: string; thicknessIn: number; }) => {
    const t = p.thicknessIn;
    setThickness(round(unit === "mm" ? t * MM_PER_IN : t, unit === "mm" ? 3 : 5));
    setShowPresetModal(false);
  };

  const addPreset = (name: string, tValue: number) => {
    const tIn = toInches(Number(tValue), unit);
    if (!tIn || tIn <= 0) return;
    setPresets((prev: any[]) => [{ name: name || `${fmt(unit === "mm" ? tIn * 25.4 : tIn, 3)} ${unit}` , thicknessIn: tIn }, ...prev]);
  };

  const removePreset = (idx: number) => setPresets((prev: any[]) => prev.filter((_: any, i: number) => i !== idx));

  const saveRoll = (name?: string) => {
    if (!calc.valid) return;
    const entry = {
      name: name || `Roll ${savedRolls.length + 1}`,
      unit,
      od: round(od, 3),
      id: round(id, 3),
      thickness: round(thickness, 5),
      savedAt: Date.now(),
      lengthIn: round((calc as any).lengthIn, 2),
      lengthFt: round((calc as any).lengthFt, 2),
      lengthM: round((calc as any).lengthM, 2),
      lengthYd: round((calc as any).lengthYd, 2),
    };
    setSavedRolls((prev: any[]) => [entry, ...prev]);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return savedRolls;
    return savedRolls.filter((r) =>
      (r.name || "").toLowerCase().includes(q) || String(r.od).includes(q) || String(r.id).includes(q)
    );
  }, [search, savedRolls]);

  const exportCSV = () => {
    const csv = toCSV(savedRolls);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vinyl_rolls_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- DEV SELF-CHECKS (non-blocking) --------------------------------------
  useEffect(() => {
    try {
      console.assert(round(toInches(25.4, 'mm'), 3) === 1, 'mm→in conversion failed');
      console.assert(round(toMM(1, 'in'), 1) === 25.4, 'in→mm conversion failed');
      const odIn = 6, idIn = 3, tIn = 0.003;
      const testLenIn = (Math.PI * (odIn * odIn - idIn * idIn)) / (4 * tIn);
      console.assert(testLenIn > 0, 'length formula produced non-positive value');
    } catch (err) {
      console.warn('Self-checks skipped', err);
    }
  }, []);

  // --- UI -------------------------------------------------------------------
  return (
    <div className={cx("min-h-screen transition-colors", isDark ? "bg-gradient-to-b from-neutral-950 to-black text-neutral-100" : "bg-gradient-to-b from-white to-neutral-100 text-neutral-900")}> 
      <div className="mx-auto max-w-6xl p-6 md:p-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <BrandMark logoUrl={logoUrl} isDark={isDark} />
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Vinyl Remaining</h1>
              <p className="text-sm md:text-base text-neutral-600 dark:text-neutral-400 mt-1">Elegant calculator for roll length from OD, core and thickness.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Unit toggle */}
            <div className={cx("inline-flex rounded-2xl overflow-hidden border backdrop-blur", isDark ? "border-white/10 bg-white/5" : "border-black/10 bg-white shadow-md")} >
              <button
                className={cx("px-3 md:px-4 py-2 text-sm", unit === "in" ? "bg-black text-white" : "hover:bg-black/5 dark:hover:bg-white/10")}
                onClick={() => toggleUnit("in")}
              >
                in
              </button>
              <button
                className={cx("px-3 md:px-4 py-2 text-sm", unit === "mm" ? "bg-black text-white" : "hover:bg-black/5 dark:hover:bg-white/10")}
                onClick={() => toggleUnit("mm")}
              >
                mm
              </button>
            </div>

            {/* Theme menu */}
            <div className={cx("inline-flex rounded-2xl overflow-hidden border backdrop-blur", isDark ? "border-white/10 bg-white/5" : "border-black/10 bg-white shadow-md")} >
              {["light", "auto", "dark"].map((m) => (
                <button
                  key={m}
                  title={`Theme: ${m}`}
                  className={cx("px-3 md:px-4 py-2 text-sm capitalize", theme === m ? "bg-black text-white" : "hover:bg-black/5 dark:hover:bg-white/10")}
                  onClick={() => setTheme(m as any)}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Thickness presets */}
            <button
              className={cx("px-3 md:px-4 py-2 text-sm rounded-2xl border", isDark ? "border-white/10 bg-white/5 hover:bg-white/10" : "border-black/10 bg-white hover:bg-white shadow-md")}
              onClick={() => setShowPresetModal(true)}
            >
              Thickness List
            </button>
          </div>
        </header>

        {/* Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Inputs card */}
          <section className={`lg:col-span-2 ${cardClass}`}>
            <h2 className="text-lg font-semibold mb-4">Inputs</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* OD */}
              <div>
                <label className={`text-sm ${mutedText}` }>Outside Diameter (OD)</label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={od}
                    onChange={(e) => setOd(Number(e.target.value))}
                    className={inputClass}
                    step={unit === "mm" ? 0.1 : 0.01}
                    min={0}
                  />
                  <span className="text-sm text-neutral-500">{unit}</span>
                </div>
              </div>

              {/* ID */}
              <div>
                <label className={`text-sm ${mutedText}` }>Core Diameter (ID)</label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={id}
                    onChange={(e) => setId(Number(e.target.value))}
                    className={inputClass}
                    step={unit === "mm" ? 0.1 : 0.01}
                    min={0}
                  />
                  <span className="text-sm text-neutral-500">{unit}</span>
                </div>
                
              </div>

              {/* Thickness */}
              <div>
                <label className={`text-sm ${mutedText}` }>Material Thickness</label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={thickness}
                    onChange={(e) => setThickness(Number(e.target.value))}
                    className={inputClass}
                    step={unit === "mm" ? 0.005 : 0.0001}
                    min={0}
                  />
                  <span className="text-sm text-neutral-500">{unit}</span>
                  <button
                    className={cx("px-3 py-2 text-sm rounded-xl border", isDark ? "border-white/10 bg-white/5 hover:bg-white/10" : "border-black/10 bg-white hover:bg-white shadow-md")}
                    onClick={() => setShowPresetModal(true)}
                  >
                    Choose…
                  </button>
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  Tip: Press <kbd className="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10">t</kbd> to open thickness list.
                </p>
              </div>
            </div>

            {/* Validation */}
            {(!calc.valid) && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200 border border-red-200/60 dark:border-red-800/50">
                {"" + (calc as any).message}
              </div>
            )}
          </section>

          {/* Results card */}
          <section className={cardClass}>
            <h2 className="text-lg font-semibold mb-4">Result</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className={cx("rounded-2xl p-4 border", isDark ? "border-white/10 bg-white/5" : "border-black/10 bg-white/80")}>
                <div className="text-sm text-neutral-500">Feet</div>
                <div className="text-2xl font-semibold">{fmt((calc as any).valid ? (calc as any).lengthFt : 0, 2)} ft</div>
              </div>
              <div className={cx("rounded-2xl p-4 border", isDark ? "border-white/10 bg-white/5" : "border-black/10 bg-white/80")}>
                <div className="text-sm text-neutral-500">Meters</div>
                <div className="text-2xl font-semibold">{fmt((calc as any).valid ? (calc as any).lengthM : 0, 2)} m</div>
              </div>
              <div className={cx("rounded-2xl p-4 border", isDark ? "border-white/10 bg-white/5" : "border-black/10 bg-white/80")}>
                <div className="text-sm text-neutral-500">Inches</div>
                <div className="text-2xl font-semibold">{fmt((calc as any).valid ? (calc as any).lengthIn : 0, 0)} in</div>
              </div>
              <div className={cx("rounded-2xl p-4 border", isDark ? "border-white/10 bg-white/5" : "border-black/10 bg-white/80")}>
                <div className="text-sm text-neutral-500">Yards</div>
                <div className="text-2xl font-semibold">{fmt((calc as any).valid ? (calc as any).lengthYd : 0, 2)} yd</div>
              </div>
            </div>
          </section>
        </div>

        {/* History & Tools */}
        <section className={`mt-6 ${cardClass}`}>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold">Saved Rolls</h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-white/80 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl px-3 py-2">
                <input
                  id="search-input"
                  placeholder="Search ( / )"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-transparent outline-none text-sm w-44"
                />
              </div>
              <button
                className={cx("px-3 py-2 text-sm rounded-2xl border", isDark ? "border-white/10 bg-white/5 hover:bg-white/10" : "border-black/10 bg-white hover:bg_WHITE shadow-md".replace("bg_WHITE","bg-white"))}
                onClick={exportCSV}
              >
                Export CSV
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <input
              ref={nameRef}
              placeholder="Name this roll (press S)"
              className="flex-1 px-3 py-2 rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-white/5 outline-none"
            />
            <button
              className={cx("px-4 py-2 rounded-2xl bg-black text-white hover:opacity-90", !isDark && "shadow-md")}
              onClick={() => saveRoll(nameRef.current?.value || undefined)}
            >
              Save current
            </button>
            <button
              className={cx("px-4 py-2 rounded-2xl border", isDark ? "border-white/10 bg-white/5 hover:bg-white/10" : "border-black/10 bg-white hover:bg-white shadow-md")}
              onClick={() => {
                setSavedRolls([]);
              }}
            >
              Clear all
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-neutral-500">
                <tr>
                  <th className="py-2 pr-3">Saved</th>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">OD ({unit})</th>
                  <th className="py-2 pr-3">ID ({unit})</th>
                  <th className="py-2 pr-3">Thk ({unit})</th>
                  <th className="py-2 pr-3">Feet</th>
                  <th className="py-2 pr-3">Meters</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-neutral-500">No saved rolls yet.</td>
                  </tr>
                ) : (
                  filtered.map((r, i) => (
                    <tr key={i} className="border-t border-black/5 dark:border-white/10">
                      <td className="py-2 pr-3 whitespace-nowrap">{new Date(r.savedAt).toLocaleString()}</td>
                      <td className="py-2 pr-3">{r.name}</td>
                      <td className="py-2 pr-3">{fmt(r.od, 3)}</td>
                      <td className="py-2 pr-3">{fmt(r.id, 3)}</td>
                      <td className="py-2 pr-3">{fmt(r.thickness, 5)}</td>
                      <td className="py-2 pr-3">{fmt(r.lengthFt, 2)}</td>
                      <td className="py-2 pr-3">{fmt(r.lengthM, 2)}</td>
                      <td className="py-2 pr-3">
                        <div className="flex gap-2">
                          <button
                            className={cx("px-3 py-1.5 rounded-xl", isDark ? "bg_WHITE".replace("bg_WHITE","bg-white/10 hover:bg-white/15") : "bg-black/5 hover:bg-black/10 shadow-sm")}
                            title="Load"
                            onClick={() => {
                              // load respecting r.unit
                              if (unit !== r.unit) toggleUnit(r.unit as any);
                              setOd(r.od);
                              setId(r.id);
                              setThickness(r.thickness);
                            }}
                          >
                            Use
                          </button>
                          <button
                            className={cx("px-3 py-1.5 rounded-xl text-red-600", isDark ? "bg-red-500/10 hover:bg-red-500/20" : "bg-red-500/10 hover:bg-red-500/20 shadow-sm")}
                            title="Delete"
                            onClick={() => {
                              const idx = savedRolls.findIndex((sr) => sr.savedAt === r.savedAt);
                              if (idx >= 0) setSavedRolls(savedRolls.filter((_, i2) => i2 !== idx));
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Presets Modal */}
        <Modal open={showPresetModal} onClose={() => setShowPresetModal(false)} title="Thickness List & Presets" isDark={isDark}>
          <PresetManager
            unit={unit}
            presets={presets}
            onApply={applyPreset}
            onAdd={addPreset}
            onRemove={removePreset}
            isDark={isDark}
          />
        </Modal>

        {/* Footer */}
        <footer className="text-xs text-neutral-500 dark:text-neutral-400 mt-8 text-center">
          <p>Formula: L = π × (OD² − ID²) / (4 × t). Inputs are in {unit}; results show common units.</p>
          <p className="mt-1">Shortcuts: <kbd className="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10">/</kbd> search, <kbd className="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10">S</kbd> save, <kbd className="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10">T</kbd> thickness list.</p>
        </footer>
      </div>
    </div>
  );
}

function PresetManager({ unit, presets, onApply, onAdd, onRemove, isDark }: { unit: string; presets: any[]; onApply: (p:any)=>void; onAdd: (name:string, val:number)=>void; onRemove:(idx:number)=>void; isDark: boolean; }) {
  const [name, setName] = useState("");
  const [t, setT] = useState("");

  // Dev check: ensure isDark is passed correctly
  useEffect(() => {
    try {
      console.assert(typeof isDark === 'boolean', 'PresetManager: isDark prop is missing or not a boolean');
    } catch {}
  }, [isDark]);

  return (
    <div className="space-y-5">
      <div className={cx("rounded-2xl p-4", isDark ? "border border-white/10 bg-white/5" : "border border-black/10 bg-white shadow-sm")}>
        <h4 className="font-medium mb-3">Add a thickness</h4>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3">
          <input
            placeholder="Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={cx("px-3 py-2 rounded-xl border outline-none", isDark ? "border-white/10 bg-neutral-800 focus:ring-2 focus:ring-white/20" : "border-black/10 bg-white focus:ring-2 focus:ring-black/10 shadow-inner")}
          />
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="decimal"
              placeholder={`Thickness in ${unit}`}
              value={t}
              onChange={(e) => setT(e.target.value)}
              className={cx("w-full sm:w-20 px-3 py-2 rounded-xl border outline-none", isDark ? "border-white/10 bg-neutral-800 focus:ring-2 focus:ring-white/20" : "border-black/10 bg-white focus:ring-2 focus:ring-black/10 shadow-inner")}
              step={unit === "mm" ? 0.005 : 0.0001}
              min={0}
            />
            <span className="text-sm text-neutral-500">{unit}</span>
          </div>
          <button
            className={cx("px-4 py-2 rounded-xl bg-black text-white hover:opacity-90", !isDark && "shadow-md")}
            onClick={() => {
              onAdd(name, Number(t));
              setName("");
              setT("");
            }}
          >
            Add
          </button>
        </div>
        <p className="text-xs text-neutral-500 mt-2">All presets are stored internally in inches and auto-convert when applied.</p>
      </div>

      <div className={cx("rounded-2xl", isDark ? "border border-white/10 bg-white/5" : "border border-black/10 bg-white shadow-sm")}>
        <div className="px-4 py-3 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
          <h4 className="font-medium">Your thickness list</h4>
          <span className="text-xs text-neutral-500">{presets.length} saved</span>
        </div>
        <ul className="max-h-72 overflow-auto divide-y divide-black/5 dark:divide-white/10">
          {presets.length === 0 ? (
            <li className="p-4 text-sm text-neutral-500">No presets yet. Add one above.</li>
          ) : (
            presets.map((p, i) => (
              <li key={i} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-sm text-neutral-500">
                    {unit === "mm" ? `${fmt(p.thicknessIn * 25.4, 3)} mm` : `${fmt(p.thicknessIn, 5)} in`} (stored)
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className={cx("px-3 py-1.5 rounded-xl", isDark ? "bg-white/10 hover:bg-white/15" : "bg-black/5 hover:bg-black/10 shadow-sm")}
                    onClick={() => onApply(p)}
                  >
                    Apply
                  </button>
                  <button
                    className={cx("px-3 py-1.5 rounded-xl text-red-600", isDark ? "bg-red-500/10 hover:bg-red-500/20" : "bg-red-500/10 hover:bg-red-500/20 shadow-sm")}
                    onClick={() => onRemove(i)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="text-xs text-neutral-500">
        Suggestions: Add common films (e.g., 0.002–0.004 in), laminates (0.0015–0.002 in), or metric values (50–100 μm).
      </div>
    </div>
  );
}

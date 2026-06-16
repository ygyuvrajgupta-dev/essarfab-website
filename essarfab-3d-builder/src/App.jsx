import { useState, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Text } from "@react-three/drei";
import Panel from "./components/Panel";
import CornerTrim from "./components/CornerTrim";
import Door from "./components/Door";
import FloorSlab from "./components/FloorSlab";
import QuoteModal from "./components/QuoteModal";
import "./App.css";

// ─── Constants ───────────────────────────────────────────────────────────────
const PANEL_WIDTH_OPTIONS = [
  { label: "1000 mm", value: 1.0 },
  { label: "1150 mm", value: 1.15 },
  { label: "1200 mm", value: 1.2 },
];

const COLOR_OPTIONS = [
  { hex: "#f5f5f5", name: "White" },
  { hex: "#fffde7", name: "Ivory" },
  { hex: "#e3f2fd", name: "Light Blue" },
  { hex: "#e8f5e9", name: "Light Green" },
  { hex: "#eceff1", name: "Silver" },
  { hex: "#1b5e20", name: "Dark Green" },
];

const STRUCTURE_TYPES = [
  { value: "coldroom",  label: "🧊 Cold Room / Cold Storage" },
  { value: "warehouse", label: "🏭 Warehouse / Industrial Shed" },
  { value: "cleanroom", label: "🔬 Pharma Clean Room" },
  { value: "office",    label: "🏢 Modular Office / Porta Cabin" },
];

const STEPS = [
  { id: 1, label: "Structure" },
  { id: 2, label: "Partitions" },
  { id: 3, label: "Openings" },
  { id: 4, label: "Panels" },
  { id: 5, label: "Results" },
];

// ─── Calculator Core ─────────────────────────────────────────────────────────
function calculate({ length, width, height, partitions, openings, panelWidthM, panelThickness }) {
  const pw = panelWidthM;

  // Outer walls gross areas
  const walls = [
    { id: "front", label: "Front Wall",   wallLen: length, wallH: height },
    { id: "back",  label: "Back Wall",    wallLen: length, wallH: height },
    { id: "left",  label: "Left Wall",    wallLen: width,  wallH: height },
    { id: "right", label: "Right Wall",   wallLen: width,  wallH: height },
  ];

  // Deduct openings from walls
  const wallRows = walls.map(w => {
    const grossArea = w.wallLen * w.wallH;
    const openingDeduction = openings
      .filter(o => o.wall === w.id)
      .reduce((sum, o) => sum + (parseFloat(o.width) || 0) * (parseFloat(o.height) || 0), 0);
    const netArea = Math.max(0, grossArea - openingDeduction);
    const panelCount = Math.ceil(w.wallLen / pw);
    return { ...w, grossArea, openingDeduction, netArea, panelCount };
  });

  // Roof
  const roofArea = length * width;
  const roofPanelCount = Math.ceil(length / pw) * Math.ceil(width / pw);

  // Partitions
  const partitionRows = partitions.map((p, i) => {
    const l = parseFloat(p.length) || 0;
    const h = parseFloat(p.height) || height;
    const deduct = openings
      .filter(o => o.wall === `partition_${i}`)
      .reduce((sum, o) => sum + (parseFloat(o.width) || 0) * (parseFloat(o.height) || 0), 0);
    const grossArea = l * h;
    const netArea = Math.max(0, grossArea - deduct);
    const panelCount = Math.ceil(l / pw);
    return { label: p.label || `Partition ${i + 1}`, grossArea, netArea, panelCount, deduct, length: l, height: h };
  });

  const totalWallPanels = wallRows.reduce((s, w) => s + w.panelCount, 0);
  const totalPartitionPanels = partitionRows.reduce((s, p) => s + p.panelCount, 0);
  const totalPanels = totalWallPanels + roofPanelCount + totalPartitionPanels;

  const totalWallArea = wallRows.reduce((s, w) => s + w.netArea, 0);
  const totalPartitionArea = partitionRows.reduce((s, p) => s + p.netArea, 0);
  const totalArea = totalWallArea + roofArea + totalPartitionArea;

  // Weight: ~12 kg per mm thickness per m² (approximate for PUF panel)
  const weight = totalArea * panelThickness * 0.012;

  return { wallRows, roofArea, roofPanelCount, partitionRows, totalPanels, totalArea, weight };
}

// ─── 3D Scene ─────────────────────────────────────────────────────────────────
function Scene({ length, width, height, panelThickness, panelColor, panelWidthM, showRoof, openings }) {
  const t = panelThickness / 1000;
  const pw = panelWidthM;

  const doors = openings.filter(o => o.type === "door");

  return (
    <>
      <color attach="background" args={["#0d1f16"]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[20, 25, 15]} intensity={2.0} castShadow
        shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
      <directionalLight position={[-15, 10, -10]} intensity={0.5} />
      <pointLight position={[0, height * 2.5, 0]} intensity={0.3} color="#d9f0e6" />

      <OrbitControls makeDefault target={[0, height / 2, 0]}
        minDistance={3} maxDistance={100} maxPolarAngle={Math.PI / 2.05} />

      <Grid position={[0, 0, 0]} args={[200, 200]}
        cellSize={1} cellThickness={0.4} cellColor="#1f6e43"
        sectionSize={5} sectionThickness={1} sectionColor="#0a3b2f"
        fadeDistance={80} infiniteGrid />

      <FloorSlab length={length} width={width} />

      {/* Walls */}
      <Panel position={[0, height / 2, width / 2]} size={[length, height, t]} color={panelColor} panelWidth={pw} />
      <Panel position={[0, height / 2, -width / 2]} rotation={[0, Math.PI, 0]} size={[length, height, t]} color={panelColor} panelWidth={pw} />
      <Panel position={[-length / 2, height / 2, 0]} rotation={[0, -Math.PI / 2, 0]} size={[width, height, t]} color={panelColor} panelWidth={pw} />
      <Panel position={[length / 2, height / 2, 0]} rotation={[0, Math.PI / 2, 0]} size={[width, height, t]} color={panelColor} panelWidth={pw} />

      {/* Roof */}
      {showRoof && (
        <Panel position={[0, height + t / 2, 0]} rotation={[Math.PI / 2, 0, 0]}
          size={[length, width, t]} color={panelColor} panelWidth={pw} />
      )}

      {/* Corner trims */}
      {[[-length/2, width/2], [length/2, width/2], [-length/2, -width/2], [length/2, -width/2]].map(([x, z], i) => (
        <CornerTrim key={i} position={[x, height / 2, z]} height={height} />
      ))}

      {/* Doors from openings */}
      {doors.filter(d => d.wall === "front").map((d, i) => (
        <Door key={i} position={[0, (parseFloat(d.height)||2.1)/2, width/2]}
          rotation={[0,0,0]} doorWidth={parseFloat(d.width)||1.2}
          doorHeight={parseFloat(d.height)||2.1} color={panelColor} thickness={t} />
      ))}

      {/* Dimension text */}
      <Text position={[0, height + 1.5, width / 2 + 0.5]}
        fontSize={0.45} color="#f5a623" anchorX="center" anchorY="middle"
        outlineWidth={0.03} outlineColor="#000">
        {`${length}m × ${width}m × ${height}m`}
      </Text>
    </>
  );
}

// ─── Step Components ──────────────────────────────────────────────────────────
function StepIndicator({ current, total }) {
  return (
    <div className="step-indicator">
      {STEPS.map((s) => (
        <div key={s.id} className={`step-dot ${current === s.id ? "active" : current > s.id ? "done" : ""}`}>
          <span className="dot">{current > s.id ? "✓" : s.id}</span>
          <span className="step-label">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [step, setStep] = useState(1);

  // Step 1 — Structure
  const [structureType, setStructureType] = useState("coldroom");
  const [length, setLength] = useState(10);
  const [width, setWidth]   = useState(8);
  const [height, setHeight] = useState(4);

  // Step 2 — Partitions
  const [partitions, setPartitions] = useState([]);

  // Step 3 — Openings
  const [openings, setOpenings] = useState([
    { id: 1, type: "door", wall: "front", width: "1.2", height: "2.1", label: "Main Door" }
  ]);

  // Step 4 — Panel config
  const [panelThickness, setPanelThickness] = useState(100);
  const [panelColor,     setPanelColor]     = useState("#f5f5f5");
  const [panelWidthMM,   setPanelWidthMM]   = useState(1200);
  const [showRoof,       setShowRoof]       = useState(true);

  // Quote modal
  const [quoteOpen, setQuoteOpen] = useState(false);

  const panelWidthM = panelWidthMM / 1000;

  // Live calculation
  const calc = useMemo(() => calculate({
    length, width, height, partitions, openings, panelWidthM, panelThickness
  }), [length, width, height, partitions, openings, panelWidthM, panelThickness]);

  // Partition helpers
  const addPartition = () =>
    setPartitions(p => [...p, { id: Date.now(), label: `Partition ${p.length + 1}`, length: "5", height: String(height) }]);
  const removePartition = (id) => setPartitions(p => p.filter(x => x.id !== id));
  const updatePartition = (id, field, val) =>
    setPartitions(p => p.map(x => x.id === id ? { ...x, [field]: val } : x));

  // Opening helpers
  const addOpening = () =>
    setOpenings(o => [...o, { id: Date.now(), type: "door", wall: "front", width: "1.2", height: "2.1", label: "Opening" }]);
  const removeOpening = (id) => setOpenings(o => o.filter(x => x.id !== id));
  const updateOpening = (id, field, val) =>
    setOpenings(o => o.map(x => x.id === id ? { ...x, [field]: val } : x));

  const next = () => setStep(s => Math.min(s + 1, 5));
  const prev = () => setStep(s => Math.max(s - 1, 1));

  return (
    <div className="app-layout">
      {/* ─── SIDEBAR ─────────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-inner">

          {/* Brand */}
          <div className="brand">
            <div className="brand-logo">ESSARFAB</div>
            <div className="brand-subtitle">PUF Panel Calculator &amp; 3D Builder</div>
            <a className="back-link" href="../../index.html">← Back to Website</a>
          </div>

          {/* Step Indicator */}
          <StepIndicator current={step} />

          {/* ════ STEP 1 — STRUCTURE ════ */}
          {step === 1 && (
            <div className="step-content">
              <div className="step-title">Step 1: Structure Details</div>
              <p className="step-desc">What type of structure are you building? Enter the outer dimensions.</p>

              <div className="field">
                <span className="field-label">Structure Type</span>
                {STRUCTURE_TYPES.map(s => (
                  <label key={s.value} className="radio-label">
                    <input type="radio" name="st" value={s.value}
                      checked={structureType === s.value}
                      onChange={() => setStructureType(s.value)} />
                    {s.label}
                  </label>
                ))}
              </div>

              <div className="dim-row">
                <label>
                  Length (m)
                  <input type="number" min={2} max={100} step={0.5} value={length}
                    onChange={e => setLength(Math.max(2, parseFloat(e.target.value)||2))} />
                </label>
                <label>
                  Width (m)
                  <input type="number" min={2} max={100} step={0.5} value={width}
                    onChange={e => setWidth(Math.max(2, parseFloat(e.target.value)||2))} />
                </label>
                <label>
                  Height (m)
                  <input type="number" min={2} max={15} step={0.5} value={height}
                    onChange={e => setHeight(Math.max(2, parseFloat(e.target.value)||2))} />
                </label>
              </div>

              <div className="dim-summary">
                <span>Floor Area: <strong>{(length*width).toFixed(1)} m²</strong></span>
                <span>Perimeter: <strong>{(2*(length+width)).toFixed(1)} m</strong></span>
                <span>Wall Area (gross): <strong>{(2*(length+width)*height).toFixed(1)} m²</strong></span>
              </div>
            </div>
          )}

          {/* ════ STEP 2 — PARTITIONS ════ */}
          {step === 2 && (
            <div className="step-content">
              <div className="step-title">Step 2: Internal Partitions</div>
              <p className="step-desc">Add any internal partition walls (room dividers, cold room sections, etc.). Skip if none.</p>

              {partitions.length === 0 && (
                <div className="empty-hint">No partitions added yet. Click below to add one.</div>
              )}

              {partitions.map((p, i) => (
                <div className="partition-row" key={p.id}>
                  <div className="partition-row-header">
                    <span className="partition-number">Partition {i + 1}</span>
                    <button className="remove-btn" onClick={() => removePartition(p.id)}>✕</button>
                  </div>
                  <div className="dim-row">
                    <label>
                      Label
                      <input type="text" value={p.label}
                        onChange={e => updatePartition(p.id, "label", e.target.value)}
                        placeholder="e.g. Room Divider" />
                    </label>
                    <label>
                      Length (m)
                      <input type="number" min={0.5} step={0.5} value={p.length}
                        onChange={e => updatePartition(p.id, "length", e.target.value)} />
                    </label>
                    <label>
                      Height (m)
                      <input type="number" min={1} max={15} step={0.5} value={p.height}
                        onChange={e => updatePartition(p.id, "height", e.target.value)} />
                    </label>
                  </div>
                  <div className="partition-area">
                    Area: <strong>{((parseFloat(p.length)||0)*(parseFloat(p.height)||0)).toFixed(2)} m²</strong>
                  </div>
                </div>
              ))}

              <button className="btn btn-outline full-width add-btn" onClick={addPartition}>
                + Add Partition Wall
              </button>

              {partitions.length > 0 && (
                <div className="dim-summary" style={{marginTop:"12px"}}>
                  Total Partition Area: <strong>
                    {partitions.reduce((s,p)=>s+(parseFloat(p.length)||0)*(parseFloat(p.height)||0),0).toFixed(2)} m²
                  </strong>
                </div>
              )}
            </div>
          )}

          {/* ════ STEP 3 — OPENINGS ════ */}
          {step === 3 && (
            <div className="step-content">
              <div className="step-title">Step 3: Doors &amp; Windows</div>
              <p className="step-desc">Add all openings — doors and windows. These areas will be deducted from the panel calculation.</p>

              {openings.map((o, i) => (
                <div className="partition-row" key={o.id}>
                  <div className="partition-row-header">
                    <span className="partition-number">{o.type === "door" ? "🚪" : "🪟"} Opening {i + 1}</span>
                    <button className="remove-btn" onClick={() => removeOpening(o.id)}>✕</button>
                  </div>
                  <div className="dim-row two-col">
                    <label>
                      Label
                      <input type="text" value={o.label}
                        onChange={e => updateOpening(o.id, "label", e.target.value)} />
                    </label>
                    <label>
                      Type
                      <select value={o.type} onChange={e => updateOpening(o.id, "type", e.target.value)}>
                        <option value="door">Door</option>
                        <option value="window">Window</option>
                      </select>
                    </label>
                    <label>
                      Wall / Location
                      <select value={o.wall} onChange={e => updateOpening(o.id, "wall", e.target.value)}>
                        <option value="front">Front Wall</option>
                        <option value="back">Back Wall</option>
                        <option value="left">Left Wall</option>
                        <option value="right">Right Wall</option>
                        {partitions.map((p, pi) => (
                          <option key={pi} value={`partition_${pi}`}>{p.label || `Partition ${pi+1}`}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Width (m)
                      <input type="number" min={0.5} max={5} step={0.1} value={o.width}
                        onChange={e => updateOpening(o.id, "width", e.target.value)} />
                    </label>
                    <label>
                      Height (m)
                      <input type="number" min={0.5} max={5} step={0.1} value={o.height}
                        onChange={e => updateOpening(o.id, "height", e.target.value)} />
                    </label>
                  </div>
                  <div className="partition-area">
                    Opening Area: <strong>{((parseFloat(o.width)||0)*(parseFloat(o.height)||0)).toFixed(2)} m²</strong>
                  </div>
                </div>
              ))}

              <button className="btn btn-outline full-width add-btn" onClick={addOpening}>
                + Add Door / Window
              </button>

              {openings.length > 0 && (
                <div className="dim-summary" style={{marginTop:"12px"}}>
                  Total Deducted Area: <strong>
                    {openings.reduce((s,o)=>s+(parseFloat(o.width)||0)*(parseFloat(o.height)||0),0).toFixed(2)} m²
                  </strong>
                </div>
              )}
            </div>
          )}

          {/* ════ STEP 4 — PANELS ════ */}
          {step === 4 && (
            <div className="step-content">
              <div className="step-title">Step 4: Panel Configuration</div>
              <p className="step-desc">Select your PUF sandwich panel specifications.</p>

              <label>
                Panel Thickness
                <select value={panelThickness} onChange={e => setPanelThickness(Number(e.target.value))}>
                  <option value={60}>60 mm — Light insulation</option>
                  <option value={80}>80 mm — Standard</option>
                  <option value={100}>100 mm — Cold Room (default)</option>
                  <option value={120}>120 mm — Deep Freeze</option>
                  <option value={150}>150 mm — Heavy insulation</option>
                </select>
              </label>

              <label>
                Standard Panel Width
                <select value={panelWidthMM} onChange={e => setPanelWidthMM(Number(e.target.value))}>
                  {PANEL_WIDTH_OPTIONS.map(o => (
                    <option key={o.value} value={o.value * 1000}>{o.label}</option>
                  ))}
                </select>
              </label>

              <div className="field">
                <span className="field-label">Panel Color / Finish</span>
                <div className="color-swatches">
                  {COLOR_OPTIONS.map(c => (
                    <button key={c.hex} title={c.name}
                      className={`swatch${panelColor === c.hex ? " active" : ""}`}
                      style={{ background: c.hex }}
                      onClick={() => setPanelColor(c.hex)} />
                  ))}
                </div>
                <span className="selected-color-name">
                  Selected: {COLOR_OPTIONS.find(c => c.hex === panelColor)?.name}
                </span>
              </div>

              <label className="toggle-label">
                <input type="checkbox" checked={showRoof}
                  onChange={e => setShowRoof(e.target.checked)} />
                Include Roof Panels in calculation
              </label>

              <div className="info-box">
                <strong>λ = 0.021 W/mK</strong> · Density 40±2 kg/m³ · CFC-free · Fire rated IS 12436
              </div>
            </div>
          )}

          {/* ════ STEP 5 — RESULTS ════ */}
          {step === 5 && (
            <div className="step-content results-content">
              <div className="step-title">📊 Panel Calculation Results</div>

              <div className="results-summary-grid">
                <div className="result-stat accent">
                  <span className="rs-val">{calc.totalPanels}</span>
                  <span className="rs-label">Total Panels</span>
                </div>
                <div className="result-stat">
                  <span className="rs-val">{calc.totalArea.toFixed(1)}</span>
                  <span className="rs-label">Total Area (m²)</span>
                </div>
                <div className="result-stat">
                  <span className="rs-val">{calc.weight.toFixed(0)}</span>
                  <span className="rs-label">Est. Weight (kg)</span>
                </div>
                <div className="result-stat">
                  <span className="rs-val">{panelThickness} mm</span>
                  <span className="rs-label">Thickness</span>
                </div>
              </div>

              <div className="results-table-wrap">
                <div className="results-section-title">Outer Walls</div>
                <table className="calc-table">
                  <thead><tr><th>Wall</th><th>Gross m²</th><th>Deduct m²</th><th>Net m²</th><th>Panels</th></tr></thead>
                  <tbody>
                    {calc.wallRows.map(w => (
                      <tr key={w.id}>
                        <td>{w.label}</td>
                        <td>{w.grossArea.toFixed(1)}</td>
                        <td>{w.openingDeduction > 0 ? <span className="deduct">-{w.openingDeduction.toFixed(1)}</span> : "—"}</td>
                        <td>{w.netArea.toFixed(1)}</td>
                        <td><strong>{w.panelCount}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {showRoof && (
                  <>
                    <div className="results-section-title" style={{marginTop:"10px"}}>Roof</div>
                    <table className="calc-table">
                      <tbody>
                        <tr><td>Roof Panel</td><td>{(length*width).toFixed(1)}</td><td>—</td><td>{(length*width).toFixed(1)}</td><td><strong>{calc.roofPanelCount}</strong></td></tr>
                      </tbody>
                    </table>
                  </>
                )}

                {calc.partitionRows.length > 0 && (
                  <>
                    <div className="results-section-title" style={{marginTop:"10px"}}>Partitions</div>
                    <table className="calc-table">
                      <thead><tr><th>Partition</th><th>Gross m²</th><th>Deduct m²</th><th>Net m²</th><th>Panels</th></tr></thead>
                      <tbody>
                        {calc.partitionRows.map((p, i) => (
                          <tr key={i}>
                            <td>{p.label}</td>
                            <td>{p.grossArea.toFixed(1)}</td>
                            <td>{p.deduct > 0 ? <span className="deduct">-{p.deduct.toFixed(1)}</span> : "—"}</td>
                            <td>{p.netArea.toFixed(1)}</td>
                            <td><strong>{p.panelCount}</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}

                {openings.length > 0 && (
                  <>
                    <div className="results-section-title" style={{marginTop:"10px"}}>Openings (Deducted)</div>
                    <table className="calc-table">
                      <thead><tr><th>Label</th><th>Type</th><th>W×H</th><th>Area m²</th></tr></thead>
                      <tbody>
                        {openings.map(o => (
                          <tr key={o.id}>
                            <td>{o.label}</td>
                            <td style={{textTransform:"capitalize"}}>{o.type}</td>
                            <td>{o.width}×{o.height}m</td>
                            <td><span className="deduct">-{((parseFloat(o.width)||0)*(parseFloat(o.height)||0)).toFixed(2)}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </div>

              <button className="btn btn-primary full-width quote-btn" onClick={() => setQuoteOpen(true)}>
                📄 Generate Full Quote Summary
              </button>
            </div>
          )}

          {/* ─── Step Navigation ─── */}
          <div className="step-nav">
            {step > 1 && (
              <button className="btn btn-outline" onClick={prev}>← Back</button>
            )}
            {step < 5 && (
              <button className="btn btn-primary" onClick={next}>
                {step === 4 ? "Calculate →" : "Next →"}
              </button>
            )}
            {step === 5 && (
              <button className="btn btn-outline" onClick={() => setStep(1)}>↺ Start Over</button>
            )}
          </div>

        </div>
      </aside>

      {/* ─── 3D CANVAS ─────────────────────────────────────────── */}
      <main className="canvas-area">
        <Canvas shadows camera={{ position: [length * 1.6, height * 2.2, width * 2], fov: 45 }} gl={{ antialias: true }}>
          <Scene
            length={length} width={width} height={height}
            panelThickness={panelThickness} panelColor={panelColor}
            panelWidthM={panelWidthMM / 1000}
            showRoof={showRoof} openings={openings}
          />
        </Canvas>

        {/* 3D overlay hint */}
        <div className="canvas-hint">🖱️ Drag to orbit · Scroll to zoom · Right-click to pan</div>
      </main>

      {/* ─── QUOTE MODAL ───────────────────────────────────────── */}
      <QuoteModal
        open={quoteOpen}
        onClose={() => setQuoteOpen(false)}
        config={{ length, width, height, panelThickness, panelColor, panelWidthMM, structureType, showRoof }}
        calc={calc}
        openings={openings}
        partitions={partitions}
        COLOR_OPTIONS={COLOR_OPTIONS}
        STRUCTURE_TYPES={STRUCTURE_TYPES}
      />
    </div>
  );
}

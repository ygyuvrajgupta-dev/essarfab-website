import { useState, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Text } from "@react-three/drei";
import Panel from "./components/Panel";
import CornerTrim from "./components/CornerTrim";
import Door from "./components/Door";
import Window from "./components/Window";
import FloorSlab from "./components/FloorSlab";
import QuoteModal from "./components/QuoteModal";
import {
  layoutAlongWall,
  getPartitionLayouts,
  getOpeningTransform,
  groupOpeningsByWall,
} from "./utils/sceneLayout";
import "./App.css";

// ─── Unit conversion ─────────────────────────────────────────────────────────
const FT_PER_M = 3.28084;
const M_PER_FT = 0.3048;

function toM(val, unit) { return unit === "ft" ? val * M_PER_FT : val; }
function fromM(val, unit) { return unit === "ft" ? val * FT_PER_M : val; }
function fmt(val, unit, decimals = 1) {
  const v = unit === "ft" ? val * FT_PER_M : val;
  return v % 1 === 0 ? v.toFixed(0) : v.toFixed(decimals);
}

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

const PANEL_TYPE_OPTIONS = [
  { value: "both",  label: "📋 Both — Walls & Roof" },
  { value: "wall",  label: "🧱 Walls Only" },
  { value: "roof",  label: "🏠 Roof Only" },
];

const STEPS = [
  { id: 1, label: "Structure" },
  { id: 2, label: "Partitions" },
  { id: 3, label: "Openings" },
  { id: 4, label: "Panels" },
  { id: 5, label: "Panel Type" },
  { id: 6, label: "Results" },
];

// ─── Calculator Core ─────────────────────────────────────────────────────────
function calculate({ length, width, height, partitions, openings, panelWidthM, wallThickness, roofThickness, panelType, showRoof }) {
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

  // Panel counts based on panel type selection
  let totalPanels = 0;
  if (panelType === "wall" || panelType === "both") {
    totalPanels += totalWallPanels + totalPartitionPanels;
  }
  if ((panelType === "roof" || panelType === "both") && showRoof) {
    totalPanels += roofPanelCount;
  }

  const totalWallArea = wallRows.reduce((s, w) => s + w.netArea, 0);
  const totalPartitionArea = partitionRows.reduce((s, p) => s + p.netArea, 0);

  // Weight uses appropriate thickness per panel type
  let totalArea = 0;
  let weight = 0;
  if (panelType === "wall" || panelType === "both") {
    totalArea += totalWallArea + totalPartitionArea;
    weight += (totalWallArea + totalPartitionArea) * wallThickness * 0.012;
  }
  if ((panelType === "roof" || panelType === "both") && showRoof) {
    totalArea += roofArea;
    weight += roofArea * roofThickness * 0.012;
  }

  return { wallRows, roofArea, roofPanelCount, partitionRows, totalPanels, totalArea, weight, wallThickness, roofThickness };
}

// ─── 3D Scene ─────────────────────────────────────────────────────────────────
function Scene({ length, width, height, wallThickness, roofThickness, panelColor, panelWidthM, showRoof, openings, partitions, unit, panelType }) {
  const wallT = wallThickness / 1000;
  const roofT = roofThickness / 1000;
  const pw = panelWidthM;

  const partitionLayouts = getPartitionLayouts(partitions, length, width, height);
  const partitionMap = Object.fromEntries(partitionLayouts.map(p => [`partition_${p.index}`, p]));

  const wallSpans = {
    front: length,
    back: length,
    left: width,
    right: width,
    ...Object.fromEntries(partitionLayouts.map(p => [`partition_${p.index}`, p.wallLen])),
  };

  const grouped = groupOpeningsByWall(openings);
  const placedOpenings = [];

  Object.entries(grouped).forEach(([wallId, wallOpenings]) => {
    const span = wallSpans[wallId] ?? length;
    layoutAlongWall(wallOpenings, span).forEach(({ item, offset }) => {
      const layout = partitionMap[wallId];
      const transform = getOpeningTransform(item, layout, { length, width, thickness: wallT, offset });
      if (transform) placedOpenings.push({ opening: item, ...transform });
    });
  });

  const doorCount = openings.filter(o => o.type === "door").length;
  const windowCount = openings.filter(o => o.type === "window").length;

  // Determine if walls and roof should be rendered
  const showWalls = panelType === "wall" || panelType === "both";
  const showRoofPanel = showRoof && (panelType === "roof" || panelType === "both");

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

      {/* Outer walls — only if panel type includes walls */}
      {showWalls && (
        <>
          <Panel position={[0, height / 2, width / 2]} size={[length, height, wallT]} color={panelColor} panelWidth={pw} />
          <Panel position={[0, height / 2, -width / 2]} rotation={[0, Math.PI, 0]} size={[length, height, wallT]} color={panelColor} panelWidth={pw} />
          <Panel position={[-length / 2, height / 2, 0]} rotation={[0, -Math.PI / 2, 0]} size={[width, height, wallT]} color={panelColor} panelWidth={pw} />
          <Panel position={[length / 2, height / 2, 0]} rotation={[0, Math.PI / 2, 0]} size={[width, height, wallT]} color={panelColor} panelWidth={pw} />
        </>
      )}

      {/* Internal partition walls — only if panel type includes walls */}
      {showWalls && partitionLayouts.map(({ partition, index, wallLen, wallH, z }) => (
        <group key={partition.id ?? index}>
          <Panel
            position={[0, wallH / 2, z]}
            size={[wallLen, wallH, wallT]}
            color="#dce8e0"
            panelWidth={pw}
          />
          <Text
            position={[0, wallH + 0.35, z]}
            fontSize={0.28}
            color="#3ec47e"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000"
          >
            {`P${index + 1}: ${partition.label || `Partition ${index + 1}`}`}
          </Text>
        </group>
      ))}

      {/* Roof — only if panel type includes roof */}
      {showRoofPanel && (
        <Panel position={[0, height + roofT / 2, 0]} rotation={[Math.PI / 2, 0, 0]}
          size={[length, width, roofT]} color={panelColor} panelWidth={pw} />
      )}

      {/* Corner trims — only if walls are shown */}
      {showWalls && [[-length/2, width/2], [length/2, width/2], [-length/2, -width/2], [length/2, -width/2]].map(([x, z], i) => (
        <CornerTrim key={i} position={[x, height / 2, z]} height={height} />
      ))}

      {/* Doors & windows on all walls / partitions — only if walls are shown */}
      {showWalls && placedOpenings.map(({ opening, position, rotation, width: w, height: h, sill }, i) =>
        opening.type === "door" ? (
          <group key={opening.id ?? i}>
            <Door
              position={position}
              rotation={rotation}
              doorWidth={w}
              doorHeight={h}
              color={panelColor}
              thickness={wallT}
            />
            <Text
              position={[position[0], h + 0.25, position[2]]}
              rotation={[0, rotation[1], 0]}
              fontSize={0.22}
              color="#f5a623"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.02}
              outlineColor="#000"
            >
              {opening.label || `Door ${i + 1}`}
            </Text>
          </group>
        ) : (
          <group key={opening.id ?? i}>
            <Window
              position={position}
              rotation={rotation}
              windowWidth={w}
              windowHeight={h}
              sillHeight={sill}
              thickness={wallT}
            />
            <Text
              position={[position[0], sill + h + 0.25, position[2]]}
              rotation={[0, rotation[1], 0]}
              fontSize={0.22}
              color="#64b5f6"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.02}
              outlineColor="#000"
            >
              {opening.label || `Window ${i + 1}`}
            </Text>
          </group>
        )
      )}

      {/* Summary counts in 3D */}
      <Text
        position={[-length / 2 - 0.8, height + 0.6, 0]}
        fontSize={0.32}
        color="#ffffff"
        anchorX="left"
        anchorY="middle"
        outlineWidth={0.025}
        outlineColor="#000"
      >
        {`Partitions: ${partitions.length}  |  Doors: ${doorCount}  |  Windows: ${windowCount}`}
      </Text>

      {/* Dimension text in selected unit */}
      <Text position={[0, height + 1.5, width / 2 + 0.5]}
        fontSize={0.45} color="#f5a623" anchorX="center" anchorY="middle"
        outlineWidth={0.03} outlineColor="#000">
        {unit === "ft"
          ? `${fmt(length, "ft", 1)}ft × ${fmt(width, "ft", 1)}ft × ${fmt(height, "ft", 1)}ft`
          : `${fmt(length, "m")}m × ${fmt(width, "m")}m × ${fmt(height, "m")}m`
        }
      </Text>
    </>
  );
}

// ─── Step Components ──────────────────────────────────────────────────────────
function StepIndicator({ current }) {
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
  const [unit, setUnit] = useState("m"); // "m" or "ft"

  // Step 1 — Structure (defaults in meters)
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

  // Step 4 — Panel config (general)
  const [panelColor,     setPanelColor]     = useState("#f5f5f5");
  const [panelWidthMM,   setPanelWidthMM]   = useState(1200);
  const [showRoof,       setShowRoof]       = useState(true);

  // Step 5 — Panel Type with separate thicknesses
  const [panelType,      setPanelType]      = useState("both");
  const [wallThickness,  setWallThickness]  = useState(100);
  const [roofThickness,  setRoofThickness]  = useState(100);

  // Quote modal
  const [quoteOpen, setQuoteOpen] = useState(false);

  const panelWidthM = panelWidthMM / 1000;

  const doorCount = openings.filter(o => o.type === "door").length;
  const windowCount = openings.filter(o => o.type === "window").length;
  const partitionCount = partitions.length;

  // Convert display values based on unit
  const lengthM = toM(length, unit);
  const widthM = toM(width, unit);
  const heightM = toM(height, unit);

  // Live calculation (internal always in meters)
  const calc = useMemo(() => calculate({
    length: lengthM, width: widthM, height: heightM, partitions, openings, panelWidthM,
    wallThickness, roofThickness, panelType, showRoof
  }), [lengthM, widthM, heightM, partitions, openings, panelWidthM, wallThickness, roofThickness, panelType, showRoof]);

  // Partition helpers — store values in the unit the user sees
  const addPartition = () => {
    const defaultLen = unit === "ft" ? "16" : "5";
    setPartitions(p => [...p, { id: Date.now(), label: `Partition ${p.length + 1}`, length: defaultLen, height: String(fromM(height, unit)) }]);
  };
  const removePartition = (id) => setPartitions(p => p.filter(x => x.id !== id));
  const updatePartition = (id, field, val) =>
    setPartitions(p => p.map(x => x.id === id ? { ...x, [field]: val } : x));

  // Opening helpers
  const addOpening = () => {
    const dw = unit === "ft" ? "4.0" : "1.2";
    const dh = unit === "ft" ? "7.0" : "2.1";
    setOpenings(o => [...o, { id: Date.now(), type: "door", wall: "front", width: dw, height: dh, label: "Opening" }]);
  };
  const removeOpening = (id) => setOpenings(o => o.filter(x => x.id !== id));
  const updateOpening = (id, field, val) =>
    setOpenings(o => o.map(x => x.id === id ? { ...x, [field]: val } : x));

  const next = () => setStep(s => Math.min(s + 1, 6));
  const prev = () => setStep(s => Math.max(s - 1, 1));

  // Toggle unit and convert current values
  const toggleUnit = () => {
    setUnit(u => {
      const newUnit = u === "m" ? "ft" : "m";
      // Convert existing values
      setLength(v => fromM(v, newUnit));
      setWidth(v => fromM(v, newUnit));
      setHeight(v => fromM(v, newUnit));
      setPartitions(prev => prev.map(p => ({
        ...p,
        length: String(fromM(parseFloat(p.length) || 0, newUnit)),
        height: String(fromM(parseFloat(p.height) || 0, newUnit)),
      })));
      setOpenings(prev => prev.map(o => ({
        ...o,
        width: String(fromM(parseFloat(o.width) || 0, newUnit)),
        height: String(fromM(parseFloat(o.height) || 0, newUnit)),
      })));
      return newUnit;
    });
  };

  const unitLabel = unit === "m" ? "m" : "ft";
  const areaUnitLabel = unit === "m" ? "m²" : "sq. ft";
  const displayUnit = unit === "m" ? "m" : "ft";

  return (
    <div className="app-layout">
      {/* ─── SIDEBAR ─────────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-inner">

          {/* Brand */}
          <div className="brand">
            <div className="brand-logo">ESSARFAB</div>
            <div className="brand-subtitle">PUF Panel Calculator & 3D Builder</div>
            <a className="back-link" href="../../index.html">← Back to Website</a>
          </div>

          {/* Step Indicator */}
          <StepIndicator current={step} />

          {/* ════ STEP 1 — STRUCTURE ════ */}
          {step === 1 && (
            <div className="step-content">
              <div className="step-title">Step 1: Structure Details</div>
              <p className="step-desc">What type of structure are you building? Enter the outer dimensions.</p>

              {/* Unit toggle */}
              <div className="unit-toggle">
                <span className="field-label">Unit System</span>
                <div className="unit-btns">
                  <button className={`unit-btn${unit === "m" ? " active" : ""}`} onClick={() => unit !== "m" && toggleUnit()}>Metric (m)</button>
                  <button className={`unit-btn${unit === "ft" ? " active" : ""}`} onClick={() => unit !== "ft" && toggleUnit()}>Imperial (ft)</button>
                </div>
              </div>

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
                  Length ({displayUnit})
                  <input type="number" min={1} max={unit === "ft" ? 330 : 100} step={0.5} value={length}
                    onChange={e => setLength(Math.max(1, parseFloat(e.target.value)||1))} />
                </label>
                <label>
                  Width ({displayUnit})
                  <input type="number" min={1} max={unit === "ft" ? 330 : 100} step={0.5} value={width}
                    onChange={e => setWidth(Math.max(1, parseFloat(e.target.value)||1))} />
                </label>
                <label>
                  Height ({displayUnit})
                  <input type="number" min={1} max={unit === "ft" ? 50 : 15} step={0.5} value={height}
                    onChange={e => setHeight(Math.max(1, parseFloat(e.target.value)||1))} />
                </label>
              </div>

              <div className="dim-summary">
                <span>Floor Area: <strong>{(lengthM * widthM).toFixed(1)} m² {unit === "ft" ? `/ ${(length * width).toFixed(1)} sq.ft` : ""}</strong></span>
                <span>Perimeter: <strong>{fmt(lengthM + widthM, "m", 1).replace("m","")} m {unit === "ft" ? `/ ${(2*(length+width)).toFixed(1)} ft` : ""}</strong></span>
                <span>Wall Area (gross): <strong>{(2*(lengthM + widthM) * heightM).toFixed(1)} m²</strong></span>
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
                      Length ({displayUnit})
                      <input type="number" min={1} step={0.5} value={p.length}
                        onChange={e => updatePartition(p.id, "length", e.target.value)} />
                    </label>
                    <label>
                      Height ({displayUnit})
                      <input type="number" min={1} max={unit === "ft" ? 50 : 15} step={0.5} value={p.height}
                        onChange={e => updatePartition(p.id, "height", e.target.value)} />
                    </label>
                  </div>
                  <div className="partition-area">
                    Area: <strong>{(toM(parseFloat(p.length)||0, unit) * toM(parseFloat(p.height)||0, unit)).toFixed(2)} m²</strong>
                  </div>
                </div>
              ))}

              <button className="btn btn-outline full-width add-btn" onClick={addPartition}>
                + Add Partition Wall
              </button>

              {partitions.length > 0 && (
                <div className="dim-summary" style={{marginTop:"12px"}}>
                  Total Partition Area: <strong>
                    {partitions.reduce((s,p)=>s + (toM(parseFloat(p.length)||0, unit) * toM(parseFloat(p.height)||0, unit)),0).toFixed(2)} m²
                  </strong>
                </div>
              )}
            </div>
          )}

          {/* ════ STEP 3 — OPENINGS ════ */}
          {step === 3 && (
            <div className="step-content">
              <div className="step-title">Step 3: Doors & Windows</div>
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
                      Width ({displayUnit})
                      <input type="number" min={1} max={unit === "ft" ? 16 : 5} step={0.1} value={o.width}
                        onChange={e => updateOpening(o.id, "width", e.target.value)} />
                    </label>
                    <label>
                      Height ({displayUnit})
                      <input type="number" min={1} max={unit === "ft" ? 16 : 5} step={0.1} value={o.height}
                        onChange={e => updateOpening(o.id, "height", e.target.value)} />
                    </label>
                  </div>
                  <div className="partition-area">
                    Opening Area: <strong>{(toM(parseFloat(o.width)||0, unit) * toM(parseFloat(o.height)||0, unit)).toFixed(2)} m²</strong>
                  </div>
                </div>
              ))}

              <button className="btn btn-outline full-width add-btn" onClick={addOpening}>
                + Add Door / Window
              </button>

              {openings.length > 0 && (
                <div className="dim-summary" style={{marginTop:"12px"}}>
                  Total Deducted Area: <strong>
                    {openings.reduce((s,o)=>s + (toM(parseFloat(o.width)||0, unit) * toM(parseFloat(o.height)||0, unit)),0).toFixed(2)} m²
                  </strong>
                </div>
              )}
            </div>
          )}

          {/* ════ STEP 4 — PANELS (General) ════ */}
          {step === 4 && (
            <div className="step-content">
              <div className="step-title">Step 4: Panel Specifications</div>
              <p className="step-desc">Select the common panel specifications. You can set different thicknesses for walls and roof in the next step.</p>

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
                Include Roof in calculation & 3D view
              </label>

              <div className="info-box">
                <strong>λ = 0.021 W/mK</strong> · Density 40±2 kg/m³ · CFC-free · Fire rated IS 12436
              </div>
            </div>
          )}

          {/* ════ STEP 5 — PANEL TYPE ════ */}
          {step === 5 && (
            <div className="step-content">
              <div className="step-title">Step 5: Choose Panel Type</div>
              <p className="step-desc">Select which panels you need — walls, roof, or both. You can also set different thicknesses for each.</p>

              <div className="field">
                <span className="field-label">Panel Type</span>
                {PANEL_TYPE_OPTIONS.map(s => (
                  <label key={s.value} className="radio-label">
                    <input type="radio" name="pt" value={s.value}
                      checked={panelType === s.value}
                      onChange={() => setPanelType(s.value)} />
                    {s.label}
                  </label>
                ))}
              </div>

              {/* Wall Panel Thickness — shown when walls are included */}
              {(panelType === "wall" || panelType === "both") && (
                <div className="panel-type-section">
                  <div className="panel-type-heading">🧱 Wall Panel Thickness</div>
                  <select value={wallThickness} onChange={e => setWallThickness(Number(e.target.value))}>
                    <option value={60}>60 mm — Light insulation</option>
                    <option value={80}>80 mm — Standard</option>
                    <option value={100}>100 mm — Cold Room (default)</option>
                    <option value={120}>120 mm — Deep Freeze</option>
                    <option value={150}>150 mm — Heavy insulation</option>
                  </select>
                </div>
              )}

              {/* Roof Panel Thickness — shown when roof is included */}
              {(panelType === "roof" || panelType === "both") && showRoof && (
                <div className="panel-type-section">
                  <div className="panel-type-heading">🏠 Roof Panel Thickness</div>
                  <select value={roofThickness} onChange={e => setRoofThickness(Number(e.target.value))}>
                    <option value={60}>60 mm — Light insulation</option>
                    <option value={80}>80 mm — Standard</option>
                    <option value={100}>100 mm — Cold Room (default)</option>
                    <option value={120}>120 mm — Deep Freeze</option>
                    <option value={150}>150 mm — Heavy insulation</option>
                  </select>
                </div>
              )}

              {panelType === "roof" && !showRoof && (
                <div className="info-box" style={{borderColor:"rgba(245,166,35,0.4)", color:"var(--accent)"}}>
                  ⚠️ Roof is currently disabled in Step 4. Enable "Include Roof" to configure roof panels.
                </div>
              )}

              <div className="dim-summary" style={{marginTop:"4px"}}>
                <span>Panel Type: <strong>{PANEL_TYPE_OPTIONS.find(p => p.value === panelType)?.label || panelType}</strong></span>
                {wallThickness && (panelType === "wall" || panelType === "both") && (
                  <span>Wall Thickness: <strong>{wallThickness} mm</strong></span>
                )}
                {roofThickness && (panelType === "roof" || panelType === "both") && showRoof && (
                  <span>Roof Thickness: <strong>{roofThickness} mm</strong></span>
                )}
              </div>
            </div>
          )}

          {/* ════ STEP 6 — RESULTS ════ */}
          {step === 6 && (
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
                  <span className="rs-val">{panelType === "both" ? `${wallThickness}/${roofThickness} mm` : `${panelType === "wall" ? wallThickness : roofThickness} mm`}</span>
                  <span className="rs-label">Panel Thickness</span>
                </div>
              </div>

              <div className="dim-summary" style={{justifyContent:"center"}}>
                <span>Panel Type: <strong>{PANEL_TYPE_OPTIONS.find(p => p.value === panelType)?.label || panelType}</strong></span>
                {unit === "ft" ? (
                  <span>Dimensions: <strong>{fmt(lengthM, "ft", 1)} ft × {fmt(widthM, "ft", 1)} ft × {fmt(heightM, "ft", 1)} ft</strong></span>
                ) : (
                  <span>Dimensions: <strong>{fmt(lengthM, "m")} m × {fmt(widthM, "m")} m × {fmt(heightM, "m")} m</strong></span>
                )}
                <span>Floor Area: <strong>{unit === "ft" ? (length * width).toFixed(1) : (lengthM * widthM).toFixed(1)} {unit === "ft" ? "sq.ft" : "m²"}</strong></span>
              </div>

              <div className="results-table-wrap">
                <div className="results-section-title">Outer Walls</div>
                <table className="calc-table">
                  <thead><tr><th>Wall</th><th>Gross {areaUnitLabel}</th><th>Deduct {areaUnitLabel}</th><th>Net {areaUnitLabel}</th><th>Panels</th></tr></thead>
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

                {showRoof && (panelType === "roof" || panelType === "both") && (
                  <>
                    <div className="results-section-title" style={{marginTop:"10px"}}>Roof</div>
                    <table className="calc-table">
                      <tbody>
                        <tr><td>Roof Panel</td><td>{(lengthM * widthM).toFixed(1)}</td><td>—</td><td>{(lengthM * widthM).toFixed(1)}</td><td><strong>{calc.roofPanelCount}</strong></td></tr>
                      </tbody>
                    </table>
                  </>
                )}

                {calc.partitionRows.length > 0 && (
                  <>
                    <div className="results-section-title" style={{marginTop:"10px"}}>Partitions</div>
                    <table className="calc-table">
                      <thead><tr><th>Partition</th><th>Gross {areaUnitLabel}</th><th>Deduct {areaUnitLabel}</th><th>Net {areaUnitLabel}</th><th>Panels</th></tr></thead>
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
                      <thead><tr><th>Label</th><th>Type</th><th>W×H</th><th>Area {areaUnitLabel}</th></tr></thead>
                      <tbody>
                        {openings.map(o => (
                          <tr key={o.id}>
                            <td>{o.label}</td>
                            <td style={{textTransform:"capitalize"}}>{o.type}</td>
                            <td>{o.width}×{o.height} {displayUnit}</td>
                            <td><span className="deduct">-{(toM(parseFloat(o.width)||0, unit) * toM(parseFloat(o.height)||0, unit)).toFixed(2)}</span></td>
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
            {step < 6 && (
              <button className="btn btn-primary" onClick={next}>
                {step === 5 ? "Calculate →" : "Next →"}
              </button>
            )}
            {step === 6 && (
              <button className="btn btn-outline" onClick={() => setStep(1)}>↺ Start Over</button>
            )}
          </div>

        </div>
      </aside>

      {/* ─── 3D CANVAS ─────────────────────────────────────────── */}
      <main className="canvas-area">
        <div className="canvas-stats" aria-live="polite">
          <span className="stat-chip partitions">
            <strong>{partitionCount}</strong> Partition{partitionCount !== 1 ? "s" : ""}
          </span>
          <span className="stat-chip doors">
            <strong>{doorCount}</strong> Door{doorCount !== 1 ? "s" : ""}
          </span>
          <span className="stat-chip windows">
            <strong>{windowCount}</strong> Window{windowCount !== 1 ? "s" : ""}
          </span>
          <span className="stat-chip" style={{color: "#f5a623"}}>
            <strong style={{color: "#f5a623"}}>{PANEL_TYPE_OPTIONS.find(p => p.value === panelType)?.label.split(" ")[0]}</strong>
          </span>
        </div>

        <Canvas shadows camera={{ position: [lengthM * 1.6, heightM * 2.2, widthM * 2], fov: 45 }} gl={{ antialias: true }}>
          <Scene
            length={lengthM} width={widthM} height={heightM}
            wallThickness={wallThickness} roofThickness={roofThickness}
            panelColor={panelColor}
            panelWidthM={panelWidthMM / 1000}
            showRoof={showRoof} openings={openings} partitions={partitions}
            unit={unit} panelType={panelType}
          />
        </Canvas>

        {/* 3D overlay hint */}
        <div className="canvas-hint">🖱️ Drag to orbit · Scroll to zoom · Right-click to pan</div>
      </main>

      {/* ─── QUOTE MODAL ───────────────────────────────────────── */}
      <QuoteModal
        open={quoteOpen}
        onClose={() => setQuoteOpen(false)}
        config={{ length: lengthM, width: widthM, height: heightM, displayLength: length, displayWidth: width, displayHeight: height, wallThickness, roofThickness, panelColor, panelWidthMM, structureType, showRoof, unit, panelType }}
        calc={calc}
        openings={openings}
        partitions={partitions}
        COLOR_OPTIONS={COLOR_OPTIONS}
        STRUCTURE_TYPES={STRUCTURE_TYPES}
      />
    </div>
  );
}
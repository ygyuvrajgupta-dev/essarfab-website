import { useState, useMemo, Fragment } from "react";
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

function createDefaultFloor(id, unit, index = 0) {
  return {
    id,
    label: `Floor ${index + 1}`,
    height: unit === "ft" ? String(13.1) : "4",
    panelColor: "#f5f5f5",
    panelWidthMM: 1200,
    wallThickness: 100,
    partitions: [],
    openings: [
      {
        id: Date.now() + id, type: "door", wall: "front",
        width: unit === "ft" ? "4.0" : "1.2",
        height: unit === "ft" ? "7.0" : "2.1",
        label: "Main Door",
      },
    ],
  };
}

// ─── Calculator Core ─────────────────────────────────────────────────────────
function calculate({ length, width, floors, panelType, showRoof, unit }) {
  let totalPanels = 0;
  let totalArea = 0;
  let totalWeight = 0;
  const floorResults = [];
  let cumulativeHeight = 0;

  floors.forEach((floor, fi) => {
    const floorHeightM = toM(parseFloat(floor.height) || 4, unit);
    const floorPW = (floor.panelWidthMM || 1200) / 1000;
    const wallT = floor.wallThickness || 100;
    const floorLabel = floor.label || `Floor ${fi + 1}`;

    // Outer walls gross areas
    const walls = [
      { id: `floor${fi}_front`, label: `${floorLabel} - Front`, wallLen: length, wallH: floorHeightM },
      { id: `floor${fi}_back`, label: `${floorLabel} - Back`, wallLen: length, wallH: floorHeightM },
      { id: `floor${fi}_left`, label: `${floorLabel} - Left`, wallLen: width, wallH: floorHeightM },
      { id: `floor${fi}_right`, label: `${floorLabel} - Right`, wallLen: width, wallH: floorHeightM },
    ];

    const wallRows = walls.map(w => {
      const grossArea = w.wallLen * w.wallH;
      const openingDeduction = (floor.openings || [])
        .filter(o => o.wall === w.id.replace(`floor${fi}_`, ""))
        .reduce((sum, o) => sum + (parseFloat(o.width) || 0) * (parseFloat(o.height) || 0), 0);
      const netArea = Math.max(0, grossArea - openingDeduction);
      const panelCount = Math.ceil(w.wallLen / floorPW);
      return { ...w, grossArea, openingDeduction, netArea, panelCount };
    });

    // Partitions
    const partitionRows = (floor.partitions || []).map((p, pi) => {
      const l = toM(parseFloat(p.length) || 0, unit);
      const h = toM(parseFloat(p.height) || floorHeightM, unit);
      const deduct = (floor.openings || [])
        .filter(o => o.wall === `floor${fi}_partition_${pi}`)
        .reduce((sum, o) => sum + (parseFloat(o.width) || 0) * (parseFloat(o.height) || 0), 0);
      const grossArea = l * h;
      const netArea = Math.max(0, grossArea - deduct);
      const panelCount = Math.ceil(l / floorPW);
      return { label: p.label || `Partition ${pi + 1}`, grossArea, netArea, panelCount, deduct, length: l, height: h };
    });

    let floorPanels = 0;
    let floorArea = 0;
    let floorWeight = 0;

    if (panelType === "wall" || panelType === "both") {
      floorPanels += wallRows.reduce((s, w) => s + w.panelCount, 0);
      floorPanels += partitionRows.reduce((s, p) => s + p.panelCount, 0);
      const wallArea = wallRows.reduce((s, w) => s + w.netArea, 0);
      const partArea = partitionRows.reduce((s, p) => s + p.netArea, 0);
      floorArea += wallArea + partArea;
      floorWeight += (wallArea + partArea) * wallT * 0.012;
    }

    // Roof — only on top floor
    const isTopFloor = fi === floors.length - 1;
    let roofArea = 0;
    let roofPanelCount = 0;

    if (isTopFloor && showRoof && (panelType === "roof" || panelType === "both")) {
      roofArea = length * width;
      roofPanelCount = Math.ceil(length / floorPW) * Math.ceil(width / floorPW);
      floorPanels += roofPanelCount;
      floorArea += roofArea;
      floorWeight += roofArea * 100 * 0.012; // default roof thickness 100mm
    }

    totalPanels += floorPanels;
    totalArea += floorArea;
    totalWeight += floorWeight;

    floorResults.push({
      label: floorLabel,
      height: floorHeightM,
      wallRows,
      partitionRows,
      roofArea,
      roofPanelCount,
      floorPanels,
      floorArea,
      floorWeight,
      panelColor: floor.panelColor,
      panelWidthMM: floor.panelWidthMM,
      wallThickness: wallT,
    });

    cumulativeHeight += floorHeightM;
  });

  return {
    totalPanels,
    totalArea,
    totalWeight,
    totalHeight: cumulativeHeight,
    floorResults,
  };
}

// ─── 3D Scene ─────────────────────────────────────────────────────────────────
function Scene({ length, width, floors, showRoof, unit, panelType }) {
  const floorHeights = floors.map(f => toM(parseFloat(f.height) || 4, unit));
  const totalBuildingHeight = floorHeights.reduce((a, b) => a + b, 0);
  const allDoors = floors.flatMap(f => (f.openings || []).filter(o => o.type === "door")).length;
  const allWindows = floors.flatMap(f => (f.openings || []).filter(o => o.type === "window")).length;
  const allPartitions = floors.reduce((s, f) => s + (f.partitions || []).length, 0);

  // Build floor 3D elements with y-offsets
  let yOffset = 0;
  const floorElements = [];

  floors.forEach((floor, fi) => {
    const floorH = floorHeights[fi];
    const color = floor.panelColor || "#f5f5f5";
    const pw = (floor.panelWidthMM || 1200) / 1000;
    const wallT = (floor.wallThickness || 100) / 1000;
    const roofT = 100 / 1000;
    const isTopFloor = fi === floors.length - 1;

    const partitionLayouts = getPartitionLayouts(floor.partitions || [], length, width, floorH);
    const partitionMap = Object.fromEntries(
      partitionLayouts.map(p => [`floor${fi}_partition_${p.index}`, p])
    );

    const wallSpans = {
      front: length,
      back: length,
      left: width,
      right: width,
      ...Object.fromEntries(
        partitionLayouts.map(p => [`floor${fi}_partition_${p.index}`, p.wallLen])
      ),
    };

    const grouped = groupOpeningsByWall(floor.openings || []);
    const placedOpenings = [];

    Object.entries(grouped).forEach(([wallId, wallOpenings]) => {
      const span = wallSpans[wallId] ?? length;
      layoutAlongWall(wallOpenings, span).forEach(({ item, offset }) => {
        const layout = partitionMap[`floor${fi}_${wallId}`];
        const transform = getOpeningTransform(item, layout, {
          length,
          width,
          thickness: wallT,
          offset,
        });
        if (transform) {
          placedOpenings.push({
            opening: item,
            ...transform,
            position: [
              transform.position[0],
              transform.position[1] + yOffset,
              transform.position[2],
            ],
          });
        }
      });
    });

    const showWalls = panelType === "wall" || panelType === "both";
    const showRoofPanel =
      isTopFloor && showRoof && (panelType === "roof" || panelType === "both");

    floorElements.push(
      <Fragment key={floor.id ?? fi}>
        {/* Floor slab between stories (except ground) */}
        {fi > 0 && <FloorSlab length={length} width={width} position={[0, yOffset, 0]} />}

        {/* Outer walls */}
        {showWalls && (
          <>
            <Panel
              position={[0, yOffset + floorH / 2, width / 2]}
              size={[length, floorH, wallT]}
              color={color}
              panelWidth={pw}
            />
            <Panel
              position={[0, yOffset + floorH / 2, -width / 2]}
              rotation={[0, Math.PI, 0]}
              size={[length, floorH, wallT]}
              color={color}
              panelWidth={pw}
            />
            <Panel
              position={[-length / 2, yOffset + floorH / 2, 0]}
              rotation={[0, -Math.PI / 2, 0]}
              size={[width, floorH, wallT]}
              color={color}
              panelWidth={pw}
            />
            <Panel
              position={[length / 2, yOffset + floorH / 2, 0]}
              rotation={[0, Math.PI / 2, 0]}
              size={[width, floorH, wallT]}
              color={color}
              panelWidth={pw}
            />
          </>
        )}

        {/* Internal partitions */}
        {showWalls &&
          partitionLayouts.map(({ partition, index, wallLen, wallH, z }) => (
            <Fragment key={partition.id ?? index}>
              <Panel
                position={[0, yOffset + wallH / 2, z]}
                size={[wallLen, wallH, wallT]}
                color="#dce8e0"
                panelWidth={pw}
              />
              <Text
                position={[0, yOffset + wallH + 0.35, z]}
                fontSize={0.28}
                color="#3ec47e"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.02}
                outlineColor="#000"
              >
                {`${floor.label || `F${fi + 1}`} P${index + 1}: ${partition.label || `Partition ${index + 1}`}`}
              </Text>
            </Fragment>
          ))}

        {/* Roof */}
        {showRoofPanel && (
          <Panel
            position={[0, yOffset + floorH + roofT / 2, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            size={[length, width, roofT]}
            color={color}
            panelWidth={pw}
          />
        )}

        {/* Corner trims */}
        {showWalls &&
          [
            [-length / 2, width / 2],
            [length / 2, width / 2],
            [-length / 2, -width / 2],
            [length / 2, -width / 2],
          ].map(([x, z], i) => (
            <CornerTrim
              key={`trim-${fi}-${i}`}
              position={[x, yOffset + floorH / 2, z]}
              height={floorH}
            />
          ))}

        {/* Doors & windows */}
        {showWalls &&
          placedOpenings.map(
            ({ opening, position, rotation, width: w, height: h, sill }, i) =>
              opening.type === "door" ? (
                <Fragment key={opening.id ?? `d-${fi}-${i}`}>
                  <Door
                    position={position}
                    rotation={rotation}
                    doorWidth={w}
                    doorHeight={h}
                    color={color}
                    thickness={wallT}
                  />
                  <Text
                    position={[position[0], yOffset + h + 0.25, position[2]]}
                    rotation={[0, rotation[1], 0]}
                    fontSize={0.22}
                    color="#f5a623"
                    anchorX="center"
                    anchorY="middle"
                    outlineWidth={0.02}
                    outlineColor="#000"
                  >
                    {`${floor.label || `F${fi + 1}`} ${opening.label || `Door ${i + 1}`}`}
                  </Text>
                </Fragment>
              ) : (
                <Fragment key={opening.id ?? `w-${fi}-${i}`}>
                  <Window
                    position={position}
                    rotation={rotation}
                    windowWidth={w}
                    windowHeight={h}
                    sillHeight={sill}
                    thickness={wallT}
                  />
                  <Text
                    position={[position[0], yOffset + sill + h + 0.25, position[2]]}
                    rotation={[0, rotation[1], 0]}
                    fontSize={0.22}
                    color="#64b5f6"
                    anchorX="center"
                    anchorY="middle"
                    outlineWidth={0.02}
                    outlineColor="#000"
                  >
                    {`${floor.label || `F${fi + 1}`} ${opening.label || `Window ${i + 1}`}`}
                  </Text>
                </Fragment>
              )
          )}

        {/* Floor label */}
        <Text
          position={[length / 2 + 1, yOffset + floorH / 2, 0]}
          fontSize={0.35}
          color="#f5a623"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000"
        >
          {floor.label || `Floor ${fi + 1}`}
        </Text>
      </Fragment>
    );

    yOffset += floorH;
  });

  return (
    <>
      <color attach="background" args={["#0d1f16"]} />
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[20, 25, 15]}
        intensity={2.0}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight position={[-15, 10, -10]} intensity={0.5} />
      <pointLight position={[0, 50, 0]} intensity={0.3} color="#d9f0e6" />

      <OrbitControls
        makeDefault
        target={[0, totalBuildingHeight / 2, 0]}
        minDistance={3}
        maxDistance={100}
        maxPolarAngle={Math.PI / 2.05}
      />

      <Grid
        position={[0, 0, 0]}
        args={[200, 200]}
        cellSize={1}
        cellThickness={0.4}
        cellColor="#1f6e43"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#0a3b2f"
        fadeDistance={80}
        infiniteGrid
      />

      {/* Ground slab */}
      <FloorSlab length={length} width={width} />

      {/* All floor elements */}
      {floorElements}

      {/* Summary counts */}
      <Text
        position={[-length / 2 - 0.8, totalBuildingHeight + 0.6, 0]}
        fontSize={0.32}
        color="#ffffff"
        anchorX="left"
        anchorY="middle"
        outlineWidth={0.025}
        outlineColor="#000"
      >
        {`Floors: ${floors.length}  |  Partitions: ${allPartitions}  |  Doors: ${allDoors}  |  Windows: ${allWindows}`}
      </Text>

      {/* Dimension text */}
      <Text
        position={[0, totalBuildingHeight + 1.5, width / 2 + 0.5]}
        fontSize={0.45}
        color="#f5a623"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.03}
        outlineColor="#000"
      >
        {unit === "ft"
          ? `${fmt(length, "ft", 1)}ft × ${fmt(width, "ft", 1)}ft × ${fmt(totalBuildingHeight, "ft", 1)}ft`
          : `${fmt(length, "m")}m × ${fmt(width, "m")}m × ${fmt(totalBuildingHeight, "m")}m`}
      </Text>
    </>
  );
}

// ─── Step Indicator ──────────────────────────────────────────────────────────
function StepIndicator({ current }) {
  return (
    <div className="step-indicator">
      {STEPS.map(s => (
        <div
          key={s.id}
          className={`step-dot ${current === s.id ? "active" : current > s.id ? "done" : ""}`}
        >
          <span className="dot">{current > s.id ? "✓" : s.id}</span>
          <span className="step-label">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Floor Selector ──────────────────────────────────────────────────────────
function FloorSelector({ floors, currentFloorId, onSelectFloor, onAddFloor, onRemoveFloor }) {
  return (
    <div className="floor-selector">
      <div className="floor-tabs">
        {floors.map((f, i) => (
          <button
            key={f.id}
            className={`floor-tab ${f.id === currentFloorId ? "active" : ""}`}
            onClick={() => onSelectFloor(f.id)}
          >
            <span className="floor-tab-color" style={{ background: f.panelColor || "#f5f5f5" }} />
            <span>{f.label || `Floor ${i + 1}`}</span>
            {floors.length > 1 && (
              <span
                className="floor-remove-tab"
                onClick={e => {
                  e.stopPropagation();
                  onRemoveFloor(f.id);
                }}
              >
                ✕
              </span>
            )}
          </button>
        ))}
        <button className="floor-tab add-floor-tab" onClick={onAddFloor}>
          + Add Floor
        </button>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [step, setStep] = useState(1);
  const [unit, setUnit] = useState("m");

  // Global Structure
  const [structureType, setStructureType] = useState("coldroom");
  const [length, setLength] = useState(10);
  const [width, setWidth] = useState(8);

  // Floors state
  const [floors, setFloors] = useState(() => [createDefaultFloor(Date.now(), "m", 0)]);
  const [currentFloorId, setCurrentFloorId] = useState(() => floors[0]?.id);

  // Global panel config
  const [panelType, setPanelType] = useState("both");
  const [showRoof, setShowRoof] = useState(true);

  // Quote modal
  const [quoteOpen, setQuoteOpen] = useState(false);

  // Derived
  const currentFloor = floors.find(f => f.id === currentFloorId) || floors[0];
  const totalHeightM = floors.reduce((s, f) => s + toM(parseFloat(f.height) || 4, unit), 0);
  const lengthM = toM(length, unit);
  const widthM = toM(width, unit);

  // Live calculation
  const calc = useMemo(
    () => calculate({ length: lengthM, width: widthM, floors, panelType, showRoof, unit }),
    [lengthM, widthM, floors, panelType, showRoof, unit]
  );

  // Floor CRUD
  const addFloor = () => {
    const newFloor = createDefaultFloor(Date.now(), unit, floors.length);
    setFloors(prev => [...prev, newFloor]);
    setCurrentFloorId(newFloor.id);
  };

  const removeFloor = id => {
    if (floors.length <= 1) return;
    setFloors(prev => {
      const filtered = prev.filter(f => f.id !== id);
      if (currentFloorId === id && filtered.length > 0) {
        setCurrentFloorId(filtered[filtered.length - 1].id);
      }
      return filtered;
    });
  };

  const updateFloor = (id, field, val) => {
    setFloors(prev => prev.map(f => (f.id === id ? { ...f, [field]: val } : f)));
  };

  // Current floor helpers
  const currentPartitions = currentFloor?.partitions || [];
  const currentOpenings = currentFloor?.openings || [];

  const addPartition = () => {
    const defaultLen = unit === "ft" ? "16" : "5";
    const defaultH = unit === "ft" ? "13.1" : "4";
    updateFloor(currentFloorId, "partitions", [
      ...currentPartitions,
      { id: Date.now(), label: `Partition ${currentPartitions.length + 1}`, length: defaultLen, height: defaultH },
    ]);
  };

  const removePartition = id => {
    updateFloor(currentFloorId, "partitions", currentPartitions.filter(x => x.id !== id));
  };

  const updatePartition = (id, field, val) => {
    updateFloor(
      currentFloorId,
      "partitions",
      currentPartitions.map(x => (x.id === id ? { ...x, [field]: val } : x))
    );
  };

  const addOpening = () => {
    const dw = unit === "ft" ? "4.0" : "1.2";
    const dh = unit === "ft" ? "7.0" : "2.1";
    updateFloor(currentFloorId, "openings", [
      ...currentOpenings,
      { id: Date.now(), type: "door", wall: "front", width: dw, height: dh, label: "Opening" },
    ]);
  };

  const removeOpening = id => {
    updateFloor(currentFloorId, "openings", currentOpenings.filter(x => x.id !== id));
  };

  const updateOpening = (id, field, val) => {
    updateFloor(
      currentFloorId,
      "openings",
      currentOpenings.map(x => (x.id === id ? { ...x, [field]: val } : x))
    );
  };

  const next = () => setStep(s => Math.min(s + 1, 6));
  const prev = () => setStep(s => Math.max(s - 1, 1));

  const toggleUnit = () => {
    setUnit(u => {
      const newUnit = u === "m" ? "ft" : "m";
      setLength(v => fromM(v, newUnit));
      setWidth(v => fromM(v, newUnit));
      setFloors(prev =>
        prev.map(f => ({
          ...f,
          height: String(fromM(parseFloat(f.height) || 0, newUnit)),
          partitions: (f.partitions || []).map(p => ({
            ...p,
            length: String(fromM(parseFloat(p.length) || 0, newUnit)),
            height: String(fromM(parseFloat(p.height) || 0, newUnit)),
          })),
          openings: (f.openings || []).map(o => ({
            ...o,
            width: String(fromM(parseFloat(o.width) || 0, newUnit)),
            height: String(fromM(parseFloat(o.height) || 0, newUnit)),
          })),
        }))
      );
      return newUnit;
    });
  };

  const displayUnit = unit === "m" ? "m" : "ft";
  const areaUnitLabel = unit === "m" ? "m²" : "sq. ft";

  const doorCount = floors.reduce((s, f) => s + (f.openings || []).filter(o => o.type === "door").length, 0);
  const windowCount = floors.reduce((s, f) => s + (f.openings || []).filter(o => o.type === "window").length, 0);
  const partitionCount = floors.reduce((s, f) => s + (f.partitions || []).length, 0);

  return (
    <div className="app-layout">
      {/* ─── SIDEBAR ─────────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-inner">
          {/* Brand */}
          <div className="brand">
            <div className="brand-logo">ESSARFAB</div>
            <div className="brand-subtitle">PUF Panel Calculator & 3D Builder</div>
            <a className="back-link" href="../../index.html">
              ← Back to Website
            </a>
          </div>

          {/* Step Indicator */}
          <StepIndicator current={step} />

          {/* ════ STEP 1 — STRUCTURE ════ */}
          {step === 1 && (
            <div className="step-content">
              <div className="step-title">Step 1: Structure & Floors</div>
              <p className="step-desc">Define the building footprint and add/configure floors.</p>

              <div className="unit-toggle">
                <span className="field-label">Unit System</span>
                <div className="unit-btns">
                  <button
                    className={`unit-btn${unit === "m" ? " active" : ""}`}
                    onClick={() => unit !== "m" && toggleUnit()}
                  >
                    Metric (m)
                  </button>
                  <button
                    className={`unit-btn${unit === "ft" ? " active" : ""}`}
                    onClick={() => unit !== "ft" && toggleUnit()}
                  >
                    Imperial (ft)
                  </button>
                </div>
              </div>

              <div className="field">
                <span className="field-label">Structure Type</span>
                {STRUCTURE_TYPES.map(s => (
                  <label key={s.value} className="radio-label">
                    <input
                      type="radio"
                      name="st"
                      value={s.value}
                      checked={structureType === s.value}
                      onChange={() => setStructureType(s.value)}
                    />
                    {s.label}
                  </label>
                ))}
              </div>

              <div className="dim-row">
                <label>
                  Length ({displayUnit})
                  <input
                    type="number"
                    min={1}
                    max={unit === "ft" ? 330 : 100}
                    step={0.5}
                    value={length}
                    onChange={e => setLength(Math.max(1, parseFloat(e.target.value) || 1))}
                  />
                </label>
                <label>
                  Width ({displayUnit})
                  <input
                    type="number"
                    min={1}
                    max={unit === "ft" ? 330 : 100}
                    step={0.5}
                    value={width}
                    onChange={e => setWidth(Math.max(1, parseFloat(e.target.value) || 1))}
                  />
                </label>
              </div>

              {/* Floor management */}
              <div className="floor-management">
                <span className="field-label">Floors</span>
                {floors.map((f, i) => (
                  <div key={f.id} className="floor-item">
                    <div className="floor-item-header">
                      <span className="floor-item-label">
                        <span
                          className="floor-color-dot"
                          style={{ background: f.panelColor || "#f5f5f5" }}
                        />
                        {f.label || `Floor ${i + 1}`}
                      </span>
                      {floors.length > 1 && (
                        <button className="remove-btn-sm" onClick={() => removeFloor(f.id)}>
                          ✕
                        </button>
                      )}
                    </div>
                    <div className="dim-row floor-dim-row">
                      <label>
                        Height ({displayUnit})
                        <input
                          type="number"
                          min={1}
                          max={unit === "ft" ? 50 : 15}
                          step={0.1}
                          value={f.height}
                          onChange={e =>
                            updateFloor(f.id, "height", String(Math.max(1, parseFloat(e.target.value) || 1)))
                          }
                        />
                      </label>
                      <label className="floor-color-select">
                        Color
                        <div className="floor-color-options">
                          {COLOR_OPTIONS.map(c => (
                            <button
                              key={c.hex}
                              title={c.name}
                              className={`mini-swatch${f.panelColor === c.hex ? " active" : ""}`}
                              style={{ background: c.hex }}
                              onClick={() => updateFloor(f.id, "panelColor", c.hex)}
                            />
                          ))}
                        </div>
                      </label>
                    </div>
                  </div>
                ))}
                <button
                  className="btn btn-outline full-width add-btn"
                  onClick={addFloor}
                  style={{ marginTop: "6px" }}
                >
                  + Add Another Floor
                </button>
              </div>

              <div className="dim-summary">
                <span>
                  Floors: <strong>{floors.length}</strong>
                </span>
                <span>
                  Total Height: <strong>{fmt(totalHeightM, "m", 1)} m{unit === "ft" ? ` / ${fmt(totalHeightM, "ft", 1)} ft` : ""}</strong>
                </span>
                <span>
                  Floor Area: <strong>{(lengthM * widthM).toFixed(1)} m²{unit === "ft" ? ` / ${(length * width).toFixed(1)} sq.ft` : ""}</strong>
                </span>
              </div>
            </div>
          )}

          {/* ════ STEPS 2-5 — FLOOR SELECTOR ════ */}
          {step >= 2 && step <= 5 && (
            <FloorSelector
              floors={floors}
              currentFloorId={currentFloorId}
              onSelectFloor={setCurrentFloorId}
              onAddFloor={addFloor}
              onRemoveFloor={removeFloor}
            />
          )}

          {/* ════ STEP 2 — PARTITIONS ════ */}
          {step === 2 && (
            <div className="step-content">
              <div className="step-title">Step 2: Internal Partitions</div>
              <p className="step-desc">
                Configure partitions for <strong>{currentFloor?.label || "current floor"}</strong>.
                Skip if none.
              </p>

              {currentPartitions.length === 0 && (
                <div className="empty-hint">No partitions added yet. Click below to add one.</div>
              )}

              {currentPartitions.map((p, i) => (
                <div className="partition-row" key={p.id}>
                  <div className="partition-row-header">
                    <span className="partition-number">Partition {i + 1}</span>
                    <button className="remove-btn" onClick={() => removePartition(p.id)}>
                      ✕
                    </button>
                  </div>
                  <div className="dim-row">
                    <label>
                      Label
                      <input
                        type="text"
                        value={p.label}
                        onChange={e => updatePartition(p.id, "label", e.target.value)}
                        placeholder="e.g. Room Divider"
                      />
                    </label>
                    <label>
                      Length ({displayUnit})
                      <input
                        type="number"
                        min={1}
                        step={0.5}
                        value={p.length}
                        onChange={e => updatePartition(p.id, "length", e.target.value)}
                      />
                    </label>
                    <label>
                      Height ({displayUnit})
                      <input
                        type="number"
                        min={1}
                        max={unit === "ft" ? 50 : 15}
                        step={0.5}
                        value={p.height}
                        onChange={e => updatePartition(p.id, "height", e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="partition-area">
                    Area:{" "}
                    <strong>
                      {(
                        toM(parseFloat(p.length) || 0, unit) * toM(parseFloat(p.height) || 0, unit)
                      ).toFixed(2)}{" "}
                      m²
                    </strong>
                  </div>
                </div>
              ))}

              <button className="btn btn-outline full-width add-btn" onClick={addPartition}>
                + Add Partition Wall
              </button>

              {currentPartitions.length > 0 && (
                <div className="dim-summary" style={{ marginTop: "12px" }}>
                  Total Partition Area:{" "}
                  <strong>
                    {currentPartitions
                      .reduce(
                        (s, p) =>
                          s +
                          toM(parseFloat(p.length) || 0, unit) *
                            toM(parseFloat(p.height) || 0, unit),
                        0
                      )
                      .toFixed(2)}{" "}
                    m²
                  </strong>
                </div>
              )}
            </div>
          )}

          {/* ════ STEP 3 — OPENINGS ════ */}
          {step === 3 && (
            <div className="step-content">
              <div className="step-title">Step 3: Doors & Windows</div>
              <p className="step-desc">
                Configure openings for <strong>{currentFloor?.label || "current floor"}</strong>.
              </p>

              {currentOpenings.map((o, i) => (
                <div className="partition-row" key={o.id}>
                  <div className="partition-row-header">
                    <span className="partition-number">
                      {o.type === "door" ? "🚪" : "🪟"} Opening {i + 1}
                    </span>
                    <button className="remove-btn" onClick={() => removeOpening(o.id)}>
                      ✕
                    </button>
                  </div>
                  <div className="dim-row two-col">
                    <label>
                      Label
                      <input
                        type="text"
                        value={o.label}
                        onChange={e => updateOpening(o.id, "label", e.target.value)}
                      />
                    </label>
                    <label>
                      Type
                      <select
                        value={o.type}
                        onChange={e => updateOpening(o.id, "type", e.target.value)}
                      >
                        <option value="door">Door</option>
                        <option value="window">Window</option>
                      </select>
                    </label>
                    <label>
                      Wall / Location
                      <select
                        value={o.wall}
                        onChange={e => updateOpening(o.id, "wall", e.target.value)}
                      >
                        <option value="front">Front Wall</option>
                        <option value="back">Back Wall</option>
                        <option value="left">Left Wall</option>
                        <option value="right">Right Wall</option>
                        {currentPartitions.map((p, pi) => (
                          <option key={pi} value={`partition_${pi}`}>
                            {p.label || `Partition ${pi + 1}`}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Width ({displayUnit})
                      <input
                        type="number"
                        min={1}
                        max={unit === "ft" ? 16 : 5}
                        step={0.1}
                        value={o.width}
                        onChange={e => updateOpening(o.id, "width", e.target.value)}
                      />
                    </label>
                    <label>
                      Height ({displayUnit})
                      <input
                        type="number"
                        min={1}
                        max={unit === "ft" ? 16 : 5}
                        step={0.1}
                        value={o.height}
                        onChange={e => updateOpening(o.id, "height", e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="partition-area">
                    Opening Area:{" "}
                    <strong>
                      {(
                        toM(parseFloat(o.width) || 0, unit) * toM(parseFloat(o.height) || 0, unit)
                      ).toFixed(2)}{" "}
                      m²
                    </strong>
                  </div>
                </div>
              ))}

              <button className="btn btn-outline full-width add-btn" onClick={addOpening}>
                + Add Door / Window
              </button>

              {currentOpenings.length > 0 && (
                <div className="dim-summary" style={{ marginTop: "12px" }}>
                  Total Deducted Area (this floor):{" "}
                  <strong>
                    {currentOpenings
                      .reduce(
                        (s, o) =>
                          s +
                          toM(parseFloat(o.width) || 0, unit) *
                            toM(parseFloat(o.height) || 0, unit),
                        0
                      )
                      .toFixed(2)}{" "}
                    m²
                  </strong>
                </div>
              )}
            </div>
          )}

          {/* ════ STEP 4 — PANELS (per floor) ════ */}
          {step === 4 && (
            <div className="step-content">
              <div className="step-title">Step 4: Panel Specifications</div>
              <p className="step-desc">
                Configure panel specs for <strong>{currentFloor?.label || "current floor"}</strong>.
              </p>

              <label>
                Standard Panel Width
                <select
                  value={currentFloor?.panelWidthMM || 1200}
                  onChange={e => updateFloor(currentFloorId, "panelWidthMM", Number(e.target.value))}
                >
                  {PANEL_WIDTH_OPTIONS.map(o => (
                    <option key={o.value} value={o.value * 1000}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="field">
                <span className="field-label">Panel Color / Finish</span>
                <div className="color-swatches">
                  {COLOR_OPTIONS.map(c => (
                    <button
                      key={c.hex}
                      title={c.name}
                      className={`swatch${(currentFloor?.panelColor || "#f5f5f5") === c.hex ? " active" : ""}`}
                      style={{ background: c.hex }}
                      onClick={() => updateFloor(currentFloorId, "panelColor", c.hex)}
                    />
                  ))}
                </div>
                <span className="selected-color-name">
                  Selected:{" "}
                  {COLOR_OPTIONS.find(c => c.hex === (currentFloor?.panelColor || "#f5f5f5"))?.name}
                </span>
              </div>

              <label>
                Wall Panel Thickness
                <select
                  value={currentFloor?.wallThickness || 100}
                  onChange={e => updateFloor(currentFloorId, "wallThickness", Number(e.target.value))}
                >
                  <option value={60}>60 mm — Light insulation</option>
                  <option value={80}>80 mm — Standard</option>
                  <option value={100}>100 mm — Cold Room (default)</option>
                  <option value={120}>120 mm — Deep Freeze</option>
                  <option value={150}>150 mm — Heavy insulation</option>
                </select>
              </label>

              <div className="panel-type-section" style={{ marginTop: "6px" }}>
                <div className="panel-type-heading">🏗️ Global Building Settings</div>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "0 0 8px" }}>
                  These settings apply to the entire building.
                </p>
                <label className="toggle-label" style={{ marginBottom: "8px" }}>
                  <input
                    type="checkbox"
                    checked={showRoof}
                    onChange={e => setShowRoof(e.target.checked)}
                  />
                  Include Roof in calculation & 3D view
                </label>
              </div>

              <div className="info-box">
                <strong>λ = 0.021 W/mK</strong> · Density 40±2 kg/m³ · CFC-free · Fire rated IS
                12436
              </div>
            </div>
          )}

          {/* ════ STEP 5 — PANEL TYPE ════ */}
          {step === 5 && (
            <div className="step-content">
              <div className="step-title">Step 5: Choose Panel Type</div>
              <p className="step-desc">
                Select which panels you need — walls, roof, or both. This applies to the entire
                building.
              </p>

              <div className="field">
                <span className="field-label">Panel Type</span>
                {PANEL_TYPE_OPTIONS.map(s => (
                  <label key={s.value} className="radio-label">
                    <input
                      type="radio"
                      name="pt"
                      value={s.value}
                      checked={panelType === s.value}
                      onChange={() => setPanelType(s.value)}
                    />
                    {s.label}
                  </label>
                ))}
              </div>

              {!showRoof && (panelType === "roof" || panelType === "both") && (
                <div
                  className="info-box"
                  style={{ borderColor: "rgba(245,166,35,0.4)", color: "var(--accent)" }}
                >
                  ⚠️ Roof is currently disabled. Enable "Include Roof" in Step 4.
                </div>
              )}

              {/* Per-floor thickness summary */}
              <div className="panel-type-section">
                <div className="panel-type-heading">📊 Per-Floor Wall Thickness</div>
                {floors.map((f, i) => (
                  <div key={f.id} className="floor-thickness-row">
                    <span
                      className="floor-color-dot"
                      style={{ background: f.panelColor || "#f5f5f5" }}
                    />
                    <span>{f.label || `Floor ${i + 1}`}:</span>
                    <select
                      value={f.wallThickness}
                      onChange={e =>
                        updateFloor(f.id, "wallThickness", Number(e.target.value))
                      }
                      style={{ width: "auto", minWidth: "120px", marginLeft: "auto" }}
                    >
                      <option value={60}>60 mm</option>
                      <option value={80}>80 mm</option>
                      <option value={100}>100 mm</option>
                      <option value={120}>120 mm</option>
                      <option value={150}>150 mm</option>
                    </select>
                  </div>
                ))}
              </div>

              <div className="dim-summary" style={{ marginTop: "4px" }}>
                <span>
                  Panel Type: <strong>{PANEL_TYPE_OPTIONS.find(p => p.value === panelType)?.label || panelType}</strong>
                </span>
                <span>
                  Floors: <strong>{floors.length}</strong>
                </span>
                {showRoof && (
                  <span>
                    Roof: <strong>Included</strong>
                  </span>
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
                  <span className="rs-val">{calc.totalWeight.toFixed(0)}</span>
                  <span className="rs-label">Est. Weight (kg)</span>
                </div>
                <div className="result-stat">
                  <span className="rs-val">{floors.length}</span>
                  <span className="rs-label">Floors</span>
                </div>
              </div>

              <div className="dim-summary" style={{ justifyContent: "center" }}>
                <span>
                  Panel Type: <strong>{PANEL_TYPE_OPTIONS.find(p => p.value === panelType)?.label || panelType}</strong>
                </span>
                <span>
                  Dimensions: <strong>
                    {fmt(lengthM, "m")}m × {fmt(widthM, "m")}m × {fmt(totalHeightM, "m")}m
                    {unit === "ft"
                      ? ` / ${fmt(length, "ft", 1)}ft × ${fmt(width, "ft", 1)}ft × ${fmt(totalHeightM, "ft", 1)}ft`
                      : ""}
                  </strong>
                </span>
                <span>
                  Floor Area: <strong>{(lengthM * widthM).toFixed(1)} m² per floor × {floors.length} floors</strong>
                </span>
              </div>

              {/* Per-floor breakdown */}
              <div className="results-table-wrap">
                {calc.floorResults.map((fr, fi) => (
                  <div key={fi} className="floor-result-section">
                    <div className="floor-result-header">
                      <span
                        className="floor-color-dot"
                        style={{ background: fr.panelColor }}
                      />
                      <strong>{fr.label}</strong>
                      <span style={{ marginLeft: "auto", fontSize: "11px", color: "var(--text-muted)" }}>
                        {fr.floorPanels} panels · {fr.floorArea.toFixed(1)} m²
                      </span>
                    </div>
                    <table className="calc-table">
                      <thead>
                        <tr>
                          <th>Wall</th>
                          <th>Gross {areaUnitLabel}</th>
                          <th>Net {areaUnitLabel}</th>
                          <th>Panels</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fr.wallRows.map(w => (
                          <tr key={w.id}>
                            <td>{w.label.replace(`${fr.label} - `, "")}</td>
                            <td>{w.grossArea.toFixed(1)}</td>
                            <td>{w.netArea.toFixed(1)}</td>
                            <td><strong>{w.panelCount}</strong></td>
                          </tr>
                        ))}
                        {fr.partitionRows.length > 0 &&
                          fr.partitionRows.map((p, pi) => (
                            <tr key={pi}>
                              <td style={{ color: "var(--primary-light)" }}>{p.label}</td>
                              <td>{p.grossArea.toFixed(1)}</td>
                              <td>{p.netArea.toFixed(1)}</td>
                              <td><strong>{p.panelCount}</strong></td>
                            </tr>
                          ))}
                        {fr.roofArea > 0 && (
                          <tr>
                            <td style={{ color: "var(--accent)" }}>🟠 Roof</td>
                            <td>{fr.roofArea.toFixed(1)}</td>
                            <td>{fr.roofArea.toFixed(1)}</td>
                            <td><strong>{fr.roofPanelCount}</strong></td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>

              <button
                className="btn btn-primary full-width quote-btn"
                onClick={() => setQuoteOpen(true)}
              >
                📄 Generate Full Quote Summary
              </button>
            </div>
          )}

          {/* ─── Step Navigation ─── */}
          <div className="step-nav">
            {step > 1 && (
              <button className="btn btn-outline" onClick={prev}>
                ← Back
              </button>
            )}
            {step < 6 && (
              <button className="btn btn-primary" onClick={next}>
                {step === 5 ? "Calculate →" : "Next →"}
              </button>
            )}
            {step === 6 && (
              <button className="btn btn-outline" onClick={() => setStep(1)}>
                ↺ Start Over
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ─── 3D CANVAS ─────────────────────────────────────────── */}
      <main className="canvas-area">
        <div className="canvas-stats" aria-live="polite">
          <span className="stat-chip floors">
            <strong>{floors.length}</strong> Floor{floors.length !== 1 ? "s" : ""}
          </span>
          <span className="stat-chip partitions">
            <strong>{partitionCount}</strong> Partition{partitionCount !== 1 ? "s" : ""}
          </span>
          <span className="stat-chip doors">
            <strong>{doorCount}</strong> Door{doorCount !== 1 ? "s" : ""}
          </span>
          <span className="stat-chip windows">
            <strong>{windowCount}</strong> Window{windowCount !== 1 ? "s" : ""}
          </span>
          <span className="stat-chip" style={{ color: "#f5a623" }}>
            <strong style={{ color: "#f5a623" }}>
              {PANEL_TYPE_OPTIONS.find(p => p.value === panelType)?.label.split(" ")[0]}
            </strong>
          </span>
        </div>

        <Canvas
          shadows
          camera={{
            position: [lengthM * 1.6, totalHeightM * 1.2 + 4, widthM * 2 + 4],
            fov: 45,
          }}
          gl={{ antialias: true }}
        >
          <Scene
            length={lengthM}
            width={widthM}
            floors={floors}
            showRoof={showRoof}
            unit={unit}
            panelType={panelType}
          />
        </Canvas>

        <div className="canvas-hint">🖱️ Drag to orbit · Scroll to zoom · Right-click to pan</div>
      </main>

      {/* ─── QUOTE MODAL ───────────────────────────────────────── */}
      <QuoteModal
        open={quoteOpen}
        onClose={() => setQuoteOpen(false)}
        config={{
          length: lengthM,
          width: widthM,
          totalHeight: totalHeightM,
          displayLength: length,
          displayWidth: width,
          displayTotalHeight: fmt(totalHeightM, unit, 1),
          structureType,
          showRoof,
          unit,
          panelType,
          floors: floors.length,
          panelWidthMM: 1200,
          panelThickness: 100,
        }}
        calc={calc}
        floors={floors}
        unit={unit}
        displayUnit={displayUnit}
        COLOR_OPTIONS={COLOR_OPTIONS}
        STRUCTURE_TYPES={STRUCTURE_TYPES}
      />
    </div>
  );
}
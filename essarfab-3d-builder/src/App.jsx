import { useState, useMemo, Fragment } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Text } from "@react-three/drei";
import Panel from "./components/Panel";
import CornerTrim from "./components/CornerTrim";
import Door from "./components/Door";
import Window from "./components/Window";
import FloorSlab from "./components/FloorSlab";
import QuoteModal from "./components/QuoteModal";
import Login from "./Login";
import AdminLogin from "./AdminLogin";
import AdminDashboard from "./AdminDashboard";
import ProtectedRoute from "./ProtectedRoute";
import DeviceHistory from "./DeviceHistory";
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
  { label: "1190 mm", value: 1.19 },
  { label: "1200 mm", value: 1.2 },
];

const WALL_THICKNESS_RECOMMENDED_WIDTHS = {
  50:  1190,
  60:  1190,
  80:  1150,
  100: 1150,
  120: 1000,
  150: 1000,
};

const STANDARD_PANEL_HEIGHTS_MM = [2895.6, 3048, 3657.6, 9144];
const STANDARD_PANEL_HEIGHTS_LABELS = {
  2895.6: "9.5 ft (2.90 m)",
  3048: "10 ft (3.05 m)",
  3657.6: "12 ft (3.66 m)",
  9144: "30 ft (9.14 m)",
};

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

const ROOF_TYPE_OPTIONS = [
  { value: "sandwich",     label: "🥪 Sandwich Panel (100 mm)" },
  { value: "roofing",      label: "🛖 Roofing Panel (50 mm)" },
  { value: "single_sided", label: "📐 Single-Sided PUF (75 mm)" },
];

const ROOF_THICKNESS_OPTIONS = {
  roofing:      [50, 60, 70, 80, 90, 100, 110, 120, 130],
  sandwich:     [100, 60, 50, 100, 120, 150],
  single_sided: [100, 60, 50, 100, 120, 150],
};

const ROOF_WIDTH_OPTIONS = {
  roofing:      [1000],
  sandwich:     [1150, 1190, 1200],
  single_sided: [1190, 1150, 1200],
};

const ROOF_DEFAULT_THICKNESS = {
  roofing: 50,
  sandwich: 100,
  single_sided: 75,
};

const ROOF_DEFAULT_WIDTH = {
  roofing: 1000,
  sandwich: 1150,
  single_sided: 1190,
};

const STEPS = [
  { id: 1, label: "Structure" },
  { id: 2, label: "Partitions" },
  { id: 3, label: "Openings" },
  { id: 4, label: "Panels" },
  { id: 5, label: "Panel Type" },
  { id: 6, label: "Results" },
];

const WALL_OPTIONS = [
  { value: "front", label: "Front" },
  { value: "back", label: "Back" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
];

function createDefaultFloor(id, unit, index = 0) {
  const heightVal = unit === "ft" ? 13.1 : 4;
  const roofPanelHeightVal = unit === "ft" ? 9.5 : 2.8956;
  return {
    id,
    label: `Floor ${index + 1}`,
    height: String(heightVal),
    panelColor: "#f5f5f5",
    panelWidthMM: 1200,
    panelHeightMM: Math.round(toM(heightVal, unit) * 1000),
    wallThickness: 100,
    partitions: [],
    internalRooms: [],
    openings: [
      {
        id: Date.now() + id, type: "door", wall: "front",
        width: unit === "ft" ? "4.0" : "1.2",
        height: unit === "ft" ? "7.0" : "2.1",
        label: "Main Door",
      },
    ],
    roofType: "sandwich",
    roofThickness: 100,
    roofWidth: 1150,
    roofPanelHeightMM: Math.round(toM(roofPanelHeightVal, unit) * 1000),
    showFloorRoof: false,
    showFloorSlab: false,
  };
}

function createDefaultRoom(id, unit) {
  return {
    id,
    label: "Room",
    positionX: "0", positionZ: "0",
    roomLength: unit === "ft" ? "10" : "3",
    roomWidth: unit === "ft" ? "8" : "2.5",
    roomHeight: unit === "ft" ? "8" : "2.4",
    panelColor: "#f5f5f5",
    panelWidthMM: 1200,
    wallThickness: 80,
    showCeiling: true,
    sideWalls: [],
    openings: [
      {
        id: Date.now() + id + 1, type: "door", wall: "front",
        width: unit === "ft" ? "3.0" : "0.9",
        height: unit === "ft" ? "6.5" : "2.0",
        label: "Room Door",
      },
    ],
  };
}

// ─── Calculator Core ─────────────────────────────────────────────────────────
function calculate({ length, width, floors, panelType, showRoof, roofType, roofThickness, roofWidth, unit }) {
  let totalPanels = 0;
  let totalArea = 0;
  const floorResults = [];
  let cumulativeHeight = 0;

  floors.forEach((floor, fi) => {
    const floorHeightM = toM(parseFloat(floor.height) || 4, unit);
    const floorPW = (floor.panelWidthMM || 1200) / 1000;
    const wallT = floor.wallThickness || 100;
    const floorLabel = floor.label || `Floor ${fi + 1}`;

    const walls = [
      { id: `floor${fi}_front`, label: `${floorLabel} - Front`, wallLen: length, wallH: floorHeightM },
      { id: `floor${fi}_back`, label: `${floorLabel} - Back`, wallLen: length, wallH: floorHeightM },
      { id: `floor${fi}_left`, label: `${floorLabel} - Left`, wallLen: width, wallH: floorHeightM },
      { id: `floor${fi}_right`, label: `${floorLabel} - Right`, wallLen: width, wallH: floorHeightM },
    ];

    const wallRows = walls.map(w => {
      const grossArea = w.wallLen * w.wallH;
      const panelH = (floor.panelHeightMM || 2895.6) / 1000;
      const panelCount = parseFloat((grossArea / (floorPW * panelH)).toFixed(3));
      return { ...w, grossArea, openingDeduction: 0, netArea: grossArea, panelCount };
    });

    const partitionRows = (floor.partitions || []).map((p, pi) => {
      const l = toM(parseFloat(p.length) || 0, unit);
      const h = toM(parseFloat(p.height) || floorHeightM, unit);
      const grossArea = l * h;
      const panelH = (floor.panelHeightMM || 2895.6) / 1000;
      const panelCount = parseFloat((grossArea / (floorPW * panelH)).toFixed(3));
      const partThickness = p.wallThickness || 80;
      return { label: p.label || `Partition ${pi + 1}`, grossArea, netArea: grossArea, panelCount, deduct: 0, length: l, height: h, wallThickness: partThickness };
    });

    const roomRows = (floor.internalRooms || []).map((rm, ri) => {
      const rl = toM(parseFloat(rm.roomLength) || 3, unit);
      const rw = toM(parseFloat(rm.roomWidth) || 2.5, unit);
      const rh = Math.min(toM(parseFloat(rm.roomHeight) || 2.4, unit), floorHeightM);
      const rPW = (rm.panelWidthMM || 1200) / 1000;
      const rT = rm.wallThickness || 80;
      const sideWalls = rm.sideWalls || [];

      const roomWalls = [
        { id: `room${ri}_front`, label: `${rm.label || `Room ${ri+1}`} - Front`, wallLen: rl, wallH: rh, wallKey: "front" },
        { id: `room${ri}_back`,  label: `${rm.label || `Room ${ri+1}`} - Back`,  wallLen: rl, wallH: rh, wallKey: "back" },
        { id: `room${ri}_left`,  label: `${rm.label || `Room ${ri+1}`} - Left`,  wallLen: rw, wallH: rh, wallKey: "left" },
        { id: `room${ri}_right`, label: `${rm.label || `Room ${ri+1}`} - Right`, wallLen: rw, wallH: rh, wallKey: "right" },
      ];

      const activeWalls = roomWalls.filter(w => !sideWalls.includes(w.wallKey));

      const rWallRows = activeWalls.map(w => {
        const grossArea = w.wallLen * w.wallH;
        const rPanelH = (rm.panelHeightMM || 2895.6) / 1000;
        const pCount = parseFloat((grossArea / (rPW * rPanelH)).toFixed(3));
        return { ...w, grossArea, openingDeduction: 0, netArea: grossArea, panelCount: pCount };
      });

      const roomWallPanels = rWallRows.reduce((s, w) => s + w.panelCount, 0);
      const roomWallArea = rWallRows.reduce((s, w) => s + w.netArea, 0);

      let ceilingPanels = 0;
      let ceilingArea = 0;
      if (rm.showCeiling) {
        ceilingArea = rl * rw;
        const rCeilPanelH = (rm.panelHeightMM || 2895.6) / 1000;
        ceilingPanels = parseFloat((ceilingArea / (rPW * rCeilPanelH)).toFixed(3));
      }

      return {
        label: rm.label || `Room ${ri + 1}`,
        wallRows: rWallRows,
        roomWallPanels,
        roomWallArea,
        ceilingPanels,
        ceilingArea,
        totalPanels: roomWallPanels + ceilingPanels,
        totalArea: roomWallArea + ceilingArea,
        wallThickness: rT,
        panelColor: rm.panelColor,
        panelWidthMM: rm.panelWidthMM,
        openings: rm.openings || [],
      };
    });

    let floorPanels = 0;
    let floorArea = 0;

    if (panelType === "wall" || panelType === "both") {
      floorPanels += wallRows.reduce((s, w) => s + w.panelCount, 0);
      floorPanels += partitionRows.reduce((s, p) => s + p.panelCount, 0);
      const wallArea = wallRows.reduce((s, w) => s + w.netArea, 0);
      const partArea = partitionRows.reduce((s, p) => s + p.netArea, 0);
      floorArea += wallArea + partArea;

      roomRows.forEach(rm => {
        floorPanels += rm.totalPanels;
        floorArea += rm.totalArea;
      });
    }

    let roofArea = 0;
    let roofPanelCount = 0;
    let floorRoofType = null;
    let floorRoofThickness = null;
    let floorRoofWidth = null;

    const hasFloorRoof = floor.showFloorRoof && showRoof && (panelType === "roof" || panelType === "both");
    if (hasFloorRoof) {
      floorRoofType = floor.roofType || roofType;
      floorRoofThickness = floor.roofThickness || roofThickness;
      floorRoofWidth = floor.roofWidth || roofWidth;
      roofArea = length * width;
      const roofPW = (floorRoofWidth || 1150) / 1000;
      const roofPanelH = (floor.roofPanelHeightMM || floor.panelHeightMM || 2895.6) / 1000;
      const singleRoofPanelArea = roofPW * roofPanelH;
      roofPanelCount = parseFloat((roofArea / singleRoofPanelArea).toFixed(3));
      floorPanels += roofPanelCount;
      floorArea += roofArea;
    }

    let slabArea = 0;
    let slabPanelCount = 0;
    let floorSlabThickness = null;

    const hasFloorSlab = floor.showFloorSlab && (panelType === "wall" || panelType === "both");
    if (hasFloorSlab) {
      floorSlabThickness = floor.wallThickness || 100;
      slabArea = length * width;
      const slabPW = (floor.panelWidthMM || 1200) / 1000;
      const slabPanelH = (floor.panelHeightMM || 2895.6) / 1000;
      const singleSlabPanelArea = slabPW * slabPanelH;
      slabPanelCount = parseFloat((slabArea / singleSlabPanelArea).toFixed(3));
      floorPanels += slabPanelCount;
      floorArea += slabArea;
    }

    totalPanels += floorPanels;
    totalArea += floorArea;

    floorResults.push({
      label: floorLabel,
      height: floorHeightM,
      wallRows,
      partitionRows,
      roomRows,
      roofArea,
      roofPanelCount,
      slabArea,
      slabPanelCount,
      floorSlabThickness,
      floorPanels,
      floorArea,
      panelColor: floor.panelColor,
      panelWidthMM: floor.panelWidthMM,
      wallThickness: wallT,
      floorRoofType,
      floorRoofThickness,
      floorRoofWidth,
    });

    cumulativeHeight += floorHeightM;
  });

  return {
    totalPanels,
    totalArea,
    totalHeight: cumulativeHeight,
    floorResults,
  };
}

// ─── Render a single internal room ──────────────────────────────────────────
function InternalRoom3D({ room, index, floorHeight, yOffset, unit, length, width }) {
  const rl = toM(parseFloat(room.roomLength) || 3, unit);
  const rw = toM(parseFloat(room.roomWidth) || 2.5, unit);
  const rh = Math.min(toM(parseFloat(room.roomHeight) || 2.4, unit), floorHeight);
  const px = toM(parseFloat(room.positionX) || 0, unit);
  const pz = toM(parseFloat(room.positionZ) || 0, unit);
  const color = room.panelColor || "#f5f5f5";
  const pw = (room.panelWidthMM || 1200) / 1000;
  const wallT = (room.wallThickness || 80) / 1000;

  const maxX = length / 2 - rl / 2 - 0.2;
  const maxZ = width / 2 - rw / 2 - 0.2;
  const cx = Math.max(-maxX, Math.min(maxX, px));
  const cz = Math.max(-maxZ, Math.min(maxZ, pz));

  const roomOpenings = room.openings || [];
  const placedOpenings = [];
  const wallSpans = { front: rl, back: rl, left: rw, right: rw };
  const grouped = groupOpeningsByWall(roomOpenings);

  Object.entries(grouped).forEach(([wallId, wallOpenings]) => {
    const span = wallSpans[wallId] ?? rl;
    layoutAlongWall(wallOpenings, span).forEach(({ item, offset }) => {
      const doorW = toM(parseFloat(item.width) || 0.9, unit);
      const doorH = toM(parseFloat(item.height) || 2.0, unit);
      const sill = item.type === "window" ? Math.min(1.0, Math.max(0.6, rh - doorH - 0.3)) : 0;
      // Y at floor level - Door/Window components handle internal centering
      const yPos = 0;
      const insetVal = wallT / 2 + 0.015;
      let pos, rot;

      if (wallId === "front") {
        pos = [offset, yPos, rw / 2 + insetVal]; rot = [0, 0, 0];
      } else if (wallId === "back") {
        pos = [offset, yPos, -rw / 2 - insetVal]; rot = [0, Math.PI, 0];
      } else if (wallId === "left") {
        pos = [-rl / 2 - insetVal, yPos, offset]; rot = [0, -Math.PI / 2, 0];
      } else if (wallId === "right") {
        pos = [rl / 2 + insetVal, yPos, offset]; rot = [0, Math.PI / 2, 0];
      } else return;

      pos[1] += yOffset;
      placedOpenings.push({
        opening: item,
        position: [pos[0] + cx, pos[1], pos[2] + cz],
        rotation: rot,
        width: doorW,
        height: doorH,
        sill,
      });
    });
  });

  const sideWalls = room.sideWalls || [];

  return (
    <Fragment key={room.id ?? index}>
      <Text position={[cx, yOffset + 0.05, cz]} fontSize={0.25} color="#f5a623"
        anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000">
        {room.label || `Room ${index + 1}`}
      </Text>

      {!sideWalls.includes("front") && <Panel position={[cx, yOffset + rh / 2, cz + rw / 2]} size={[rl, rh, wallT]} color={color} panelWidth={pw} />}
      {!sideWalls.includes("back") && <Panel position={[cx, yOffset + rh / 2, cz - rw / 2]} rotation={[0, Math.PI, 0]} size={[rl, rh, wallT]} color={color} panelWidth={pw} />}
      {!sideWalls.includes("left") && <Panel position={[cx - rl / 2, yOffset + rh / 2, cz]} rotation={[0, -Math.PI / 2, 0]} size={[rw, rh, wallT]} color={color} panelWidth={pw} />}
      {!sideWalls.includes("right") && <Panel position={[cx + rl / 2, yOffset + rh / 2, cz]} rotation={[0, Math.PI / 2, 0]} size={[rw, rh, wallT]} color={color} panelWidth={pw} />}

      {room.showCeiling && (
        <Panel position={[cx, yOffset + rh + wallT / 2, cz]} rotation={[Math.PI / 2, 0, 0]}
          size={[rl, rw, wallT]} color={color} panelWidth={pw} />
      )}

      {[[-rl/2, rw/2], [rl/2, rw/2], [-rl/2, -rw/2], [rl/2, -rw/2]].map(([x, z], i) => (
        <CornerTrim key={`trim-${index}-${i}`} position={[cx + x, yOffset + rh / 2, cz + z]} height={rh} />
      ))}

      {placedOpenings.map(({ opening, position, rotation, width: w, height: h, sill }, i) =>
        opening.type === "door" ? (
          <Fragment key={opening.id ?? `rd-${index}-${i}`}>
            <Door position={position} rotation={rotation} doorWidth={w} doorHeight={h} color={color} thickness={wallT} />
            <Text position={[position[0], position[1] + h / 2 + 0.2, position[2]]}
              rotation={[0, rotation[1], 0]} fontSize={0.18} color="#f5a623"
              anchorX="center" anchorY="middle" outlineWidth={0.015} outlineColor="#000">
              {opening.label || `Door`}
            </Text>
          </Fragment>
        ) : (
          <Fragment key={opening.id ?? `rw-${index}-${i}`}>
            <Window position={position} rotation={rotation} windowWidth={w} windowHeight={h} sillHeight={sill} thickness={wallT} />
            <Text position={[position[0], position[1] + h / 2 + 0.2, position[2]]}
              rotation={[0, rotation[1], 0]} fontSize={0.18} color="#64b5f6"
              anchorX="center" anchorY="middle" outlineWidth={0.015} outlineColor="#000">
              {opening.label || `Window`}
            </Text>
          </Fragment>
        )
      )}

      <Text position={[cx, yOffset + rh + 0.4, cz]} fontSize={0.22} color="#ffd54f"
        anchorX="center" anchorY="middle" outlineWidth={0.015} outlineColor="#000">
        {room.label || `Room ${index + 1}`}
      </Text>
    </Fragment>
  );
}

// ─── 3D Scene ─────────────────────────────────────────────────────────────────
function Scene({ length, width, floors, showRoof, unit, panelType }) {
  const floorHeights = floors.map(f => toM(parseFloat(f.height) || 4, unit));
  const totalBuildingHeight = floorHeights.reduce((a, b) => a + b, 0);
  const allDoors = floors.reduce((s, f) =>
    s + (f.openings || []).filter(o => o.type === "door").length
    + (f.internalRooms || []).reduce((rs, r) => rs + (r.openings || []).filter(o => o.type === "door").length, 0)
    + (f.partitions || []).reduce((ps, p) => ps + (p.openings || []).filter(o => o.type === "door").length, 0)
  , 0);
  const allWindows = floors.reduce((s, f) =>
    s + (f.openings || []).filter(o => o.type === "window").length
    + (f.internalRooms || []).reduce((rs, r) => rs + (r.openings || []).filter(o => o.type === "window").length, 0)
    + (f.partitions || []).reduce((ps, p) => ps + (p.openings || []).filter(o => o.type === "window").length, 0)
  , 0);
  const allPartitions = floors.reduce((s, f) => s + (f.partitions || []).length, 0);
  const allRooms = floors.reduce((s, f) => s + (f.internalRooms || []).length, 0);

  let yOffset = 0;
  const floorElements = [];

  floors.forEach((floor, fi) => {
    const floorH = floorHeights[fi];
    const color = floor.panelColor || "#f5f5f5";
    const pw = (floor.panelWidthMM || 1200) / 1000;
    const wallT = (floor.wallThickness || 100) / 1000;
    const roofT = 100 / 1000;

    const partitionLayouts = getPartitionLayouts(floor.partitions || [], length, width, floorH, unit);
    const partitionMap = Object.fromEntries(
      partitionLayouts.map(p => [`floor${fi}_partition_${p.index}`, p])
    );

    const wallSpans = {
      front: length, back: length, left: width, right: width,
      ...Object.fromEntries(partitionLayouts.map(p => [`floor${fi}_partition_${p.index}`, p.wallLen]))
    };

    const grouped = groupOpeningsByWall(floor.openings || []);
    const placedOpenings = [];

    Object.entries(grouped).forEach(([wallId, wallOpenings]) => {
      const span = wallSpans[wallId] ?? length;
      layoutAlongWall(wallOpenings, span).forEach(({ item, offset }) => {
        const layout = partitionMap[`floor${fi}_${wallId}`];
        const transform = getOpeningTransform(item, layout, { length, width, thickness: wallT, offset, unit });
        if (transform) {
          placedOpenings.push({
            opening: item,
            ...transform,
            position: [transform.position[0], transform.position[1] + yOffset, transform.position[2]],
          });
        }
      });
    });

    const showWalls = panelType === "wall" || panelType === "both";
    const showRoofPanel = floor.showFloorRoof && showRoof && (panelType === "roof" || panelType === "both");

    floorElements.push(
      <Fragment key={floor.id ?? fi}>
        {fi > 0 && <FloorSlab length={length} width={width} position={[0, yOffset, 0]} />}

        {showWalls && (
          <>
            <Panel position={[0, yOffset + floorH / 2, width / 2]} size={[length, floorH, wallT]} color={color} panelWidth={pw} />
            <Panel position={[0, yOffset + floorH / 2, -width / 2]} rotation={[0, Math.PI, 0]} size={[length, floorH, wallT]} color={color} panelWidth={pw} />
            <Panel position={[-length / 2, yOffset + floorH / 2, 0]} rotation={[0, -Math.PI / 2, 0]} size={[width, floorH, wallT]} color={color} panelWidth={pw} />
            <Panel position={[length / 2, yOffset + floorH / 2, 0]} rotation={[0, Math.PI / 2, 0]} size={[width, floorH, wallT]} color={color} panelWidth={pw} />
          </>
        )}

        {showWalls && partitionLayouts.map(({ partition, index, wallLen, wallH, x, z, rad }) => {
          const partOpenings = partition.openings || [];
          const placedPartOpenings = [];
          const groupedPart = groupOpeningsByWall(partOpenings);
          Object.entries(groupedPart).forEach(([wallId, wallOpenings]) => {
            const span = wallLen;
            layoutAlongWall(wallOpenings, span).forEach(({ item, offset }) => {
              const doorW = toM(parseFloat(item.width) || 0.9, unit);
              const doorH = toM(parseFloat(item.height) || 2.0, unit);
              // Y at floor level - Door/Window components handle internal centering
              const yPos = 0;
              const insetV = wallT / 2 + 0.015;
              const worldX = x + offset * Math.cos(rad) + insetV * Math.sin(rad);
              const worldZ = z + offset * Math.sin(rad) + insetV * Math.cos(rad);
              placedPartOpenings.push({
                opening: item,
                position: [worldX, yPos + yOffset, worldZ],
                rotation: [0, rad, 0],
                width: doorW,
                height: doorH,
              });
            });
          });

          // Cap partition visual height to match room walls when internal rooms exist
          const maxRoomHeight = (floor.internalRooms || []).reduce((max, r) => {
            const rh = Math.min(toM(parseFloat(r.roomHeight) || 2.4, unit), floorH);
            return Math.max(max, rh);
          }, 0);
          const effectiveH = (floor.internalRooms || []).length > 0 ? Math.min(wallH, Math.round(maxRoomHeight * 10000) / 10000) : wallH;

          return (
            <Fragment key={partition.id ?? index}>
              <Panel position={[x, yOffset + effectiveH / 2, z]} rotation={[0, rad, 0]} size={[wallLen, effectiveH, wallT]} color="#dce8e0" panelWidth={pw} />
              {placedPartOpenings.map(({ opening, position, rotation, width: w, height: h }, oi) =>
                opening.type === "door" ? (
                  <Door key={opening.id ?? `pd-${index}-${oi}`} position={position} rotation={rotation} doorWidth={w} doorHeight={h} color="#dce8e0" thickness={wallT} />
                ) : (
                  <Window key={opening.id ?? `pw-${index}-${oi}`} position={position} rotation={rotation} windowWidth={w} windowHeight={h} sillHeight={0.6} thickness={wallT} />
                )
              )}
              <Text position={[x, yOffset + wallH + 0.35, z]} fontSize={0.28} color="#3ec47e"
                anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000">
                {`${floor.label || `F${fi + 1}`} P${index + 1}: ${partition.label || `Partition ${index + 1}`}`}
              </Text>
            </Fragment>
          );
        })}

        {showWalls && (floor.internalRooms || []).map((rm, ri) => (
          <InternalRoom3D key={rm.id ?? ri} room={rm} index={ri} floorHeight={floorH} yOffset={yOffset} unit={unit} length={length} width={width} />
        ))}

        {showRoofPanel && (
          <Panel position={[0, yOffset + floorH + roofT / 2, 0]} rotation={[Math.PI / 2, 0, 0]}
            size={[length, width, roofT]} color={color} panelWidth={pw} />
        )}

        {floor.showFloorSlab && (panelType === "wall" || panelType === "both") && (
          <Panel position={[0, yOffset - wallT / 2, 0]} rotation={[Math.PI / 2, 0, 0]}
            size={[length, width, wallT]} color={color} panelWidth={pw} />
        )}

        {showWalls && [[-length/2, width/2], [length/2, width/2], [-length/2, -width/2], [length/2, -width/2]]
          .map(([x, z], i) => (
            <CornerTrim key={`trim-${fi}-${i}`} position={[x, yOffset + floorH / 2, z]} height={floorH} />
          ))}

        {showWalls && placedOpenings.map(({ opening, position, rotation, width: w, height: h, sill }, i) =>
          opening.type === "door" ? (
            <Fragment key={opening.id ?? `d-${fi}-${i}`}>
              <Door position={position} rotation={rotation} doorWidth={w} doorHeight={h} color={color} thickness={wallT} />
              <Text position={[position[0], yOffset + h + 0.25, position[2]]} rotation={[0, rotation[1], 0]}
                fontSize={0.22} color="#f5a623" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000">
                {`${floor.label || `F${fi + 1}`} ${opening.label || `Door ${i + 1}`}`}
              </Text>
            </Fragment>
          ) : (
            <Fragment key={opening.id ?? `w-${fi}-${i}`}>
              <Window position={position} rotation={rotation} windowWidth={w} windowHeight={h} sillHeight={sill} thickness={wallT} />
              <Text position={[position[0], yOffset + sill + h + 0.25, position[2]]} rotation={[0, rotation[1], 0]}
                fontSize={0.22} color="#64b5f6" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000">
                {`${floor.label || `F${fi + 1}`} ${opening.label || `Window ${i + 1}`}`}
              </Text>
            </Fragment>
          )
        )}

        <Text position={[length / 2 + 1, yOffset + floorH / 2, 0]}
          fontSize={0.35} color="#f5a623" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000">
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
      <directionalLight position={[20, 25, 15]} intensity={2.0} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
      <directionalLight position={[-15, 10, -10]} intensity={0.5} />
      <pointLight position={[0, 50, 0]} intensity={0.3} color="#d9f0e6" />

      <OrbitControls makeDefault target={[0, totalBuildingHeight / 2, 0]} minDistance={3} maxDistance={100} maxPolarAngle={Math.PI / 2.05} />

      <Grid position={[0, 0, 0]} args={[200, 200]} cellSize={1} cellThickness={0.4} cellColor="#1f6e43"
        sectionSize={5} sectionThickness={1} sectionColor="#0a3b2f" fadeDistance={80} infiniteGrid />

      <FloorSlab length={length} width={width} />
      {floorElements}

      <Text position={[-length / 2 - 0.8, totalBuildingHeight + 0.6, 0]}
        fontSize={0.32} color="#ffffff" anchorX="left" anchorY="middle" outlineWidth={0.025} outlineColor="#000">
        {`Floors: ${floors.length}  |  Rooms: ${allRooms}  |  Partitions: ${allPartitions}  |  Doors: ${allDoors}  |  Windows: ${allWindows}`}
      </Text>

      <Text position={[0, totalBuildingHeight + 1.5, width / 2 + 0.5]}
        fontSize={0.45} color="#f5a623" anchorX="center" anchorY="middle" outlineWidth={0.03} outlineColor="#000">
        {unit === "ft"
          ? `${fmt(length, "ft", 1)}ft × ${fmt(width, "ft", 1)}ft × ${fmt(totalBuildingHeight, "ft", 1)}ft`
          : `${fmt(length, "m")}m × ${fmt(width, "m")}m × ${fmt(totalBuildingHeight, "m")}m`}
      </Text>
    </>
  );
}

// ─── Step Indicator ──────────────────────────────────────────────────────────
function StepIndicator({ current, onStepClick }) {
  return (
    <div className="step-indicator">
      {STEPS.map(s => (
        <div key={s.id} className={`step-dot ${current === s.id ? "active" : current > s.id ? "done" : ""}`} onClick={() => onStepClick && onStepClick(s.id)}>
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
          <button key={f.id} className={`floor-tab ${f.id === currentFloorId ? "active" : ""}`} onClick={() => onSelectFloor(f.id)}>
            <span className="floor-tab-color" style={{ background: f.panelColor || "#f5f5f5" }} />
            <span>{f.label || `Floor ${i + 1}`}</span>
            {floors.length > 1 && (
              <span className="floor-remove-tab" onClick={e => { e.stopPropagation(); onRemoveFloor(f.id); }}>✕</span>
            )}
          </button>
        ))}
        <button className="floor-tab add-floor-tab" onClick={onAddFloor}>+ Add Floor</button>
      </div>
    </div>
  );
}

// ─── Room Opening Editor ──────────────────────────────────────────────────────
function RoomOpeningEditor({ openings, onAdd, onRemove, onUpdate, displayUnit, unit }) {
  return (
    <div className="room-openings-section">
      <div className="section-subheading">🚪 Room Openings</div>
      {openings.length === 0 && <div className="empty-hint-sm">No openings for this room. Add a door or window.</div>}
      {openings.map((o, i) => (
        <div key={o.id} className="room-opening-row">
          <div className="room-opening-header">
            <span>{o.type === "door" ? "🚪" : "🪟"} {o.label || `Opening ${i + 1}`}</span>
            <button className="remove-btn-xs" onClick={() => onRemove(o.id)}>✕</button>
          </div>
          <div className="room-opening-fields">
            <select value={o.type} onChange={e => onUpdate(o.id, "type", e.target.value)}>
              <option value="door">Door</option>
              <option value="window">Window</option>
            </select>
            <select value={o.wall} onChange={e => onUpdate(o.id, "wall", e.target.value)}>
              {WALL_OPTIONS.map(wo => <option key={wo.value} value={wo.value}>{wo.label}</option>)}
            </select>
            <input type="number" min={0.3} max={unit === "ft" ? 8 : 2.5} step={0.1}
              value={o.width} onChange={e => onUpdate(o.id, "width", e.target.value)} placeholder={`W (${displayUnit})`} />
            <input type="number" min={0.3} max={unit === "ft" ? 8 : 2.5} step={0.1}
              value={o.height} onChange={e => onUpdate(o.id, "height", e.target.value)} placeholder={`H (${displayUnit})`} />
            <input type="text" value={o.label} onChange={e => onUpdate(o.id, "label", e.target.value)} placeholder="Label" className="room-label-input" />
          </div>
        </div>
      ))}
      <button className="btn btn-outline full-width add-btn-sm" onClick={onAdd}>+ Add Door/Window</button>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [step, setStep] = useState(1);
  const [unit, setUnit] = useState("m");
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem("isAuthenticated") === "true");

  const navigate = useNavigate();
  const handleLogin = () => { setIsAuthenticated(true); navigate("/device-history"); };
  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    setIsAuthenticated(false);
  };

  const [structureType, setStructureType] = useState("coldroom");
  const [length, setLength] = useState(10);
  const [width, setWidth] = useState(8);

  const [floors, setFloors] = useState(() => [createDefaultFloor(Date.now(), "m", 0)]);
  const [currentFloorId, setCurrentFloorId] = useState(() => floors[0]?.id);

  const [panelType, setPanelType] = useState("both");
  const [showRoof, setShowRoof] = useState(true);
  const [roofType, setRoofType] = useState("sandwich");
  const [roofThickness, setRoofThickness] = useState(ROOF_DEFAULT_THICKNESS.sandwich);
  const [roofWidth, setRoofWidth] = useState(ROOF_DEFAULT_WIDTH.sandwich);

  const [quoteOpen, setQuoteOpen] = useState(false);
  const [showRoomMaker, setShowRoomMaker] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [resultsUnit, setResultsUnit] = useState("m");

  const currentFloor = floors.find(f => f.id === currentFloorId) || floors[0];
  const totalHeightM = floors.reduce((s, f) => s + toM(parseFloat(f.height) || 4, unit), 0);
  const lengthM = toM(length, unit);
  const widthM = toM(width, unit);

  const calc = useMemo(
    () => calculate({ length: lengthM, width: widthM, floors, panelType, showRoof, roofType, roofThickness, roofWidth, unit }),
    [lengthM, widthM, floors, panelType, showRoof, roofType, roofThickness, roofWidth, unit]
  );

  const addFloor = () => {
    const newFloor = createDefaultFloor(Date.now(), unit, floors.length);
    setFloors(prev => [...prev, newFloor]);
    setCurrentFloorId(newFloor.id);
  };

  const removeFloor = id => {
    if (floors.length <= 1) return;
    setFloors(prev => {
      const filtered = prev.filter(f => f.id !== id);
      if (currentFloorId === id && filtered.length > 0) setCurrentFloorId(filtered[filtered.length - 1].id);
      return filtered;
    });
  };

  const updateFloor = (id, field, val) => {
    setFloors(prev => prev.map(f => (f.id === id ? { ...f, [field]: val } : f)));
  };

  const currentPartitions = currentFloor?.partitions || [];
  const currentOpenings = currentFloor?.openings || [];
  const currentRooms = currentFloor?.internalRooms || [];

  const addPartition = () => {
    const defaultLen = unit === "ft" ? "16" : "5";
    const defaultH = unit === "ft" ? "13.1" : "4";
    updateFloor(currentFloorId, "partitions", [
      ...currentPartitions,
      { id: Date.now(), label: `Partition ${currentPartitions.length + 1}`, length: defaultLen, height: defaultH, positionX: "", positionZ: "", rotationDeg: "0", wallThickness: 80, openings: [] },
    ]);
  };

  const removePartition = id => updateFloor(currentFloorId, "partitions", currentPartitions.filter(x => x.id !== id));
  const updatePartition = (id, field, val) => updateFloor(currentFloorId, "partitions", currentPartitions.map(x => (x.id === id ? { ...x, [field]: val } : x)));

  const addPartitionOpening = (partId) => {
    const dw = unit === "ft" ? "3.0" : "0.9";
    const dh = unit === "ft" ? "6.5" : "2.0";
    updateFloor(currentFloorId, "partitions", currentPartitions.map(p =>
      p.id === partId ? { ...p, openings: [...(p.openings || []), { id: Date.now(), type: "door", wall: "partition_side", width: dw, height: dh, label: `Door ${(p.openings || []).length + 1}` }] } : p
    ));
  };

  const removePartitionOpening = (partId, opId) => {
    updateFloor(currentFloorId, "partitions", currentPartitions.map(p =>
      p.id === partId ? { ...p, openings: (p.openings || []).filter(o => o.id !== opId) } : p
    ));
  };

  const updatePartitionOpening = (partId, opId, field, val) => {
    updateFloor(currentFloorId, "partitions", currentPartitions.map(p =>
      p.id === partId ? { ...p, openings: (p.openings || []).map(o => (o.id === opId ? { ...o, [field]: val } : o)) } : p
    ));
  };

  const addOpening = () => {
    const dw = unit === "ft" ? "4.0" : "1.2";
    const dh = unit === "ft" ? "7.0" : "2.1";
    updateFloor(currentFloorId, "openings", [...currentOpenings, { id: Date.now(), type: "door", wall: "front", width: dw, height: dh, label: "Opening" }]);
  };

  const removeOpening = id => updateFloor(currentFloorId, "openings", currentOpenings.filter(x => x.id !== id));
  const updateOpening = (id, field, val) => updateFloor(currentFloorId, "openings", currentOpenings.map(x => (x.id === id ? { ...x, [field]: val } : x)));

  const addRoom = () => {
    const newRoom = createDefaultRoom(Date.now(), unit);
    updateFloor(currentFloorId, "internalRooms", [...currentRooms, newRoom]);
    setEditingRoomId(newRoom.id);
    setShowRoomMaker(true);
  };

  const removeRoom = id => {
    updateFloor(currentFloorId, "internalRooms", currentRooms.filter(r => r.id !== id));
    if (editingRoomId === id) setEditingRoomId(null);
  };

  const updateRoom = (id, field, val) => updateFloor(currentFloorId, "internalRooms", currentRooms.map(r => (r.id === id ? { ...r, [field]: val } : r)));

  const currentEditingRoom = currentRooms.find(r => r.id === editingRoomId);

  const addRoomOpening = () => {
    if (!currentEditingRoom) return;
    const dw = unit === "ft" ? "3.0" : "0.9";
    const dh = unit === "ft" ? "6.5" : "2.0";
    updateRoom(editingRoomId, "openings", [...(currentEditingRoom.openings || []), { id: Date.now(), type: "door", wall: "front", width: dw, height: dh, label: "Room Door" }]);
  };

  const removeRoomOpening = (opId) => {
    if (!currentEditingRoom) return;
    updateRoom(editingRoomId, "openings", (currentEditingRoom.openings || []).filter(o => o.id !== opId));
  };

  const updateRoomOpening = (opId, field, val) => {
    if (!currentEditingRoom) return;
    updateRoom(editingRoomId, "openings", (currentEditingRoom.openings || []).map(o => (o.id === opId ? { ...o, [field]: val } : o)));
  };

  const next = () => setStep(s => Math.min(s + 1, 6));
  const prev = () => setStep(s => Math.max(s - 1, 1));

  const toggleUnit = () => {
    setUnit(u => {
      const newUnit = u === "m" ? "ft" : "m";
      setLength(v => fromM(v, newUnit));
      setWidth(v => fromM(v, newUnit));
      setFloors(prev => prev.map(f => ({
        ...f,
        height: String(fromM(parseFloat(f.height) || 0, newUnit)),
        partitions: (f.partitions || []).map(p => ({ ...p, length: String(fromM(parseFloat(p.length) || 0, newUnit)), height: String(fromM(parseFloat(p.height) || 0, newUnit)) })),
        openings: (f.openings || []).map(o => ({ ...o, width: String(fromM(parseFloat(o.width) || 0, newUnit)), height: String(fromM(parseFloat(o.height) || 0, newUnit)) })),
        internalRooms: (f.internalRooms || []).map(r => ({
          ...r,
          positionX: String(fromM(parseFloat(r.positionX) || 0, newUnit)),
          positionZ: String(fromM(parseFloat(r.positionZ) || 0, newUnit)),
          roomLength: String(fromM(parseFloat(r.roomLength) || 3, newUnit)),
          roomWidth: String(fromM(parseFloat(r.roomWidth) || 2.5, newUnit)),
          roomHeight: String(fromM(parseFloat(r.roomHeight) || 2.4, newUnit)),
          openings: (r.openings || []).map(o => ({ ...o, width: String(fromM(parseFloat(o.width) || 0, newUnit)), height: String(fromM(parseFloat(o.height) || 0, newUnit)) })),
        })),
        roofPanelHeightMM: f.roofPanelHeightMM ? Math.round(fromM(parseFloat(f.roofPanelHeightMM) / 1000, newUnit) * 1000) : undefined,
      })));
      return newUnit;
    });
  };

  const displayUnit = unit === "m" ? "m" : "ft";
  const areaUnitLabel = unit === "m" ? "m²" : "sq. ft";

  const doorCount = floors.reduce((s, f) =>
    s + (f.openings || []).filter(o => o.type === "door").length
    + (f.internalRooms || []).reduce((rs, r) => rs + (r.openings || []).filter(o => o.type === "door").length, 0)
    + (f.partitions || []).reduce((ps, p) => ps + (p.openings || []).filter(o => o.type === "door").length, 0)
  , 0);
  const windowCount = floors.reduce((s, f) =>
    s + (f.openings || []).filter(o => o.type === "window").length
    + (f.internalRooms || []).reduce((rs, r) => rs + (r.openings || []).filter(o => o.type === "window").length, 0)
    + (f.partitions || []).reduce((ps, p) => ps + (p.openings || []).filter(o => o.type === "window").length, 0)
  , 0);
  const partitionCount = floors.reduce((s, f) => s + (f.partitions || []).length, 0);
  const roomCount = floors.reduce((s, f) => s + (f.internalRooms || []).length, 0);

  return (
    <Routes>
      <Route path="/login" element={<Login onLogin={handleLogin} />} />
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/admin-dashboard" element={<AdminDashboard />} />
      {isAuthenticated ? (
        <>
          <Route path="/" element={<DeviceHistory />} />
          <Route path="/device-history" element={<DeviceHistory />} />
          <Route path="/builder" element={
        <ProtectedRoute>
          <div className="app-layout">
            <aside className="sidebar">
              <div className="sidebar-inner">
                <div className="brand">
                  <div className="brand-logo">ESSARFAB</div>
                  <div className="brand-subtitle">PUF Panel Calculator & 3D Builder</div>
                  <a className="back-link" href="../../index.html">← Back to Website</a>
                </div>

                <StepIndicator current={step} onStepClick={setStep} />

                {step === 1 && (
                  <div className="step-content">
                    <div className="step-title">Step 1: Structure & Floors</div>
                    <p className="step-desc">Define the building footprint and add/configure floors.</p>

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
                          <input type="radio" name="st" value={s.value} checked={structureType === s.value} onChange={() => setStructureType(s.value)} />
                          {s.label}
                        </label>
                      ))}
                    </div>

                    <div className="dim-row">
                      <label>Length ({displayUnit})<input type="number" min={1} max={unit === "ft" ? 330 : 100} step={0.5} value={length} onChange={e => setLength(Math.max(1, parseFloat(e.target.value) || 1))} /></label>
                      <label>Width ({displayUnit})<input type="number" min={1} max={unit === "ft" ? 330 : 100} step={0.5} value={width} onChange={e => setWidth(Math.max(1, parseFloat(e.target.value) || 1))} /></label>
                    </div>

                    <div className="floor-management">
                      <span className="field-label">Floors</span>
                      {floors.map((f, i) => (
                        <div key={f.id} className="floor-item">
                          <div className="floor-item-header">
                            <span className="floor-item-label">
                              <span className="floor-color-dot" style={{ background: f.panelColor || "#f5f5f5" }} />
                              {f.label || `Floor ${i + 1}`}
                            </span>
                            {floors.length > 1 && <button className="remove-btn-sm" onClick={() => removeFloor(f.id)}>✕</button>}
                          </div>
                          <div className="dim-row floor-dim-row">
                            <label>Height ({displayUnit})<input type="number" min={1} max={unit === "ft" ? 50 : 15} step={0.1} value={f.height} onChange={e => {
                              const newHeight = String(Math.max(1, parseFloat(e.target.value) || 1));
                              updateFloor(f.id, "height", newHeight);
                              updateFloor(f.id, "panelHeightMM", Math.round(toM(parseFloat(newHeight), unit) * 1000));
                            }} /></label>
                            <label className="floor-color-select">Color
                              <div className="floor-color-options">
                                {COLOR_OPTIONS.map(c => (
                                  <button key={c.hex} title={c.name} className={`mini-swatch${f.panelColor === c.hex ? " active" : ""}`} style={{ background: c.hex }} onClick={() => updateFloor(f.id, "panelColor", c.hex)} />
                                ))}
                              </div>
                            </label>
                          </div>
                          <label className="toggle-label" style={{fontSize:"11px",marginTop:"2px"}}>
                            <input type="checkbox" checked={!!f.showFloorRoof} onChange={e => updateFloor(f.id, "showFloorRoof", e.target.checked)} />
                            Include Roof/Ceiling for this floor
                          </label>
                          <label className="toggle-label" style={{fontSize:"11px",marginTop:"2px"}}>
                            <input type="checkbox" checked={!!f.showFloorSlab} onChange={e => updateFloor(f.id, "showFloorSlab", e.target.checked)} />
                            Include PUF Floor Slab (ground floor)
                          </label>
                          {f.showFloorRoof && showRoof && (
                            <div className="dim-row two-col" style={{marginTop:"4px",gap:"6px"}}>
                              <label style={{fontSize:"10px"}}>Roof Type
                                <select value={f.roofType || "sandwich"} onChange={e => {
                                  updateFloor(f.id, "roofType", e.target.value);
                                  updateFloor(f.id, "roofThickness", ROOF_DEFAULT_THICKNESS[e.target.value] || 100);
                                  updateFloor(f.id, "roofWidth", ROOF_DEFAULT_WIDTH[e.target.value] || 1150);
                                }}>
                                  {ROOF_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                              </label>
                              <label style={{fontSize:"10px"}}>Thickness
                                <select value={f.roofThickness || 100} onChange={e => updateFloor(f.id, "roofThickness", Number(e.target.value))}>
                                  {(ROOF_THICKNESS_OPTIONS[f.roofType || "sandwich"] || [100]).map(t => <option key={t} value={t}>{t} mm</option>)}
                                </select>
                              </label>
                              <label style={{fontSize:"10px"}}>Width
                                <select value={f.roofWidth || 1150} onChange={e => updateFloor(f.id, "roofWidth", Number(e.target.value))}>
                                  {(ROOF_WIDTH_OPTIONS[f.roofType || "sandwich"] || [1150]).map(w => <option key={w} value={w}>{w} mm</option>)}
                                </select>
                              </label>
                              <label style={{fontSize:"10px"}}>Panel Height ({displayUnit})
                                <input type="number" min={0.5} max={20} step={0.01} value={((f.roofPanelHeightMM || 2895.6) / (unit === "ft" ? (1000 / FT_PER_M) : 1000)).toFixed(2)} onChange={e => {
                                  const valInMM = Number(e.target.value) * (unit === "ft" ? (1000 / FT_PER_M) : 1000);
                                  updateFloor(f.id, "roofPanelHeightMM", Math.max(500, valInMM || 2895.6));
                                }} placeholder={unit === "ft" ? "9.50" : "2.90"} />
                              </label>
                            </div>
                          )}
                        </div>
                      ))}
                      <button className="btn btn-outline full-width add-btn" onClick={addFloor} style={{marginTop:"6px"}}>+ Add Another Floor</button>
                    </div>

                    <div className="dim-summary">
                      <span>Floors: <strong>{floors.length}</strong></span>
                      <span>Total Height: <strong>{fmt(totalHeightM, "m", 1)} m{unit === "ft" ? ` / ${fmt(totalHeightM, "ft", 1)} ft` : ""}</strong></span>
                      <span>Floor Area: <strong>{(lengthM * widthM).toFixed(1)} m²{unit === "ft" ? ` / ${(length * width).toFixed(1)} sq.ft` : ""}</strong></span>
                    </div>
                  </div>
                )}

                {step >= 2 && step <= 5 && (
                  <FloorSelector floors={floors} currentFloorId={currentFloorId} onSelectFloor={setCurrentFloorId} onAddFloor={addFloor} onRemoveFloor={removeFloor} />
                )}

                {step === 2 && (
                  <div className="step-content">
                    <div className="step-title">Step 2: Partitions & Internal Rooms</div>
                    <p className="step-desc">Configure walls and rooms inside <strong>{currentFloor?.label || "current floor"}</strong>.</p>

                    <div className="section-subheading">🧱 Partition Walls</div>
                    {currentPartitions.length === 0 && <div className="empty-hint">No partitions yet. Add a dividing wall.</div>}
                    {currentPartitions.map((p, i) => (
                      <div className="partition-row" key={p.id}>
                        <div className="partition-row-header">
                          <span className="partition-number">Partition {i + 1}</span>
                          <button className="remove-btn" onClick={() => removePartition(p.id)}>✕</button>
                        </div>
                        <div className="dim-row">
                          <label>Label <input type="text" value={p.label} onChange={e => updatePartition(p.id, "label", e.target.value)} placeholder="e.g. Room Divider" /></label>
                          <label>Length ({displayUnit}) <input type="number" min={0.5} step={0.5} value={p.length} onChange={e => updatePartition(p.id, "length", e.target.value)} /></label>
                          <label>Height ({displayUnit}) <input type="number" min={0.5} max={unit === "ft" ? 50 : 15} step={0.5} value={p.height} onChange={e => updatePartition(p.id, "height", e.target.value)} /></label>
                        </div>
                        <div className="dim-row two-col">
                          <label>Pos X ({displayUnit}) <input type="number" step={0.1} value={p.positionX || ""} placeholder="Auto" onChange={e => updatePartition(p.id, "positionX", e.target.value)} /></label>
                          <label>Pos Z ({displayUnit}) <input type="number" step={0.1} value={p.positionZ || ""} placeholder="Auto" onChange={e => updatePartition(p.id, "positionZ", e.target.value)} /></label>
                          <label>Rotation (°)
                            <div className="rotation-slider-wrap">
                              <input type="range" min={0} max={360} step={5} value={p.rotationDeg || "0"} onChange={e => updatePartition(p.id, "rotationDeg", String(e.target.value))} className="rotation-slider" />
                              <span className="rotation-val">{(p.rotationDeg || "0") + "°"}</span>
                            </div>
                          </label>
                        </div>
                        <label>Thickness (mm)
                          <select value={p.wallThickness || 80} onChange={e => updatePartition(p.id, "wallThickness", Number(e.target.value))}>
                            <option value={50}>50 mm — Light</option>
                            <option value={60}>60 mm — Light insulation</option>
                            <option value={80}>80 mm — Standard</option>
                            <option value={100}>100 mm — Cold Room</option>
                            <option value={120}>120 mm — Deep Freeze</option>
                            <option value={150}>150 mm — Heavy insulation</option>
                          </select>
                        </label>
                        <div className="small-section-heading">🚪 Openings in this Partition</div>
                        {(p.openings || []).length === 0 && <div className="empty-hint-sm" style={{margin:"0"}}>No openings. Add a door/window.</div>}
                        {(p.openings || []).map((op, oi) => (
                          <div key={op.id} className="room-opening-row" style={{marginBottom:"4px"}}>
                            <div className="room-opening-header">
                              <span>{op.type === "door" ? "🚪" : "🪟"} {op.label || `Opening ${oi + 1}`}</span>
                              <button className="remove-btn-xs" onClick={() => removePartitionOpening(p.id, op.id)}>✕</button>
                            </div>
                            <div className="room-opening-fields">
                              <select value={op.type} onChange={e => updatePartitionOpening(p.id, op.id, "type", e.target.value)}>
                                <option value="door">Door</option>
                                <option value="window">Window</option>
                              </select>
                              <input type="number" min={0.3} max={unit === "ft" ? 8 : 2.5} step={0.1} value={op.width} onChange={e => updatePartitionOpening(p.id, op.id, "width", e.target.value)} placeholder={`W (${displayUnit})`} />
                              <input type="number" min={0.3} max={unit === "ft" ? 8 : 2.5} step={0.1} value={op.height} onChange={e => updatePartitionOpening(p.id, op.id, "height", e.target.value)} placeholder={`H (${displayUnit})`} />
                              <input type="text" value={op.label} onChange={e => updatePartitionOpening(p.id, op.id, "label", e.target.value)} placeholder="Label" />
                            </div>
                          </div>
                        ))}
                        <button className="btn btn-outline full-width add-btn-sm" onClick={() => addPartitionOpening(p.id)}>+ Add Door/Window</button>
                      </div>
                    ))}
                    <button className="btn btn-outline full-width add-btn" onClick={addPartition}>+ Add Partition Wall</button>

                    <div className="section-divider" />
                    <div className="section-subheading">🏠 Internal PUF Panel Rooms</div>
                    <p className="step-desc" style={{marginTop:"-4px", fontSize:"11px"}}>Build small PUF rooms inside this floor. Each room can have its own doors and windows.</p>

                    {currentRooms.length === 0 && <div className="empty-hint">No internal rooms yet. Add a room inside the building.</div>}

                    {currentRooms.map((rm, ri) => (
                      <div key={rm.id} className={`partition-row room-card ${editingRoomId === rm.id ? "active" : ""}`}
                        onClick={() => { setEditingRoomId(rm.id); setShowRoomMaker(true); }}>
                        <div className="partition-row-header">
                          <span className="partition-number">🏠 {rm.label || `Room ${ri + 1}`}</span>
                          <button className="remove-btn" onClick={e => { e.stopPropagation(); removeRoom(rm.id); }}>✕</button>
                        </div>
                        <div className="dim-row two-col" style={{fontSize:"11px", color:"var(--text-muted)"}}>
                          <span>Size: {rm.roomLength}×{rm.roomWidth}×{rm.roomHeight} {displayUnit}</span>
                          <span>Doors/Windows: {(rm.openings || []).length}</span>
                        </div>
                        {editingRoomId === rm.id && showRoomMaker && (
                          <div className="room-editor" onClick={e => e.stopPropagation()}>
                            <div className="dim-row two-col">
                              <label>Label <input type="text" value={rm.label} onChange={e => updateRoom(rm.id, "label", e.target.value)} /></label>
                              <label>Pos X ({displayUnit}) <input type="number" step={0.1} value={rm.positionX} onChange={e => updateRoom(rm.id, "positionX", e.target.value)} /></label>
                              <label>Pos Z ({displayUnit}) <input type="number" step={0.1} value={rm.positionZ} onChange={e => updateRoom(rm.id, "positionZ", e.target.value)} /></label>
                              <label>Length ({displayUnit}) <input type="number" min={0.5} step={0.1} value={rm.roomLength} onChange={e => updateRoom(rm.id, "roomLength", e.target.value)} /></label>
                              <label>Width ({displayUnit}) <input type="number" min={0.5} step={0.1} value={rm.roomWidth} onChange={e => updateRoom(rm.id, "roomWidth", e.target.value)} /></label>
                              <label>Height ({displayUnit}) <input type="number" min={0.5} step={0.1} value={rm.roomHeight} onChange={e => updateRoom(rm.id, "roomHeight", e.target.value)} /></label>
                            </div>
                            <div className="dim-row two-col">
                              <label>Color
                                <div className="floor-color-options" style={{marginTop:"4px"}}>
                                  {COLOR_OPTIONS.map(c => (
                                    <button key={c.hex} title={c.name} className={`mini-swatch${rm.panelColor === c.hex ? " active" : ""}`} style={{ background: c.hex }} onClick={() => updateRoom(rm.id, "panelColor", c.hex)} />
                                  ))}
                                </div>
                              </label>
                              <label>Thickness
                                <select value={rm.wallThickness} onChange={e => updateRoom(rm.id, "wallThickness", Number(e.target.value))}>
                                  <option value={60}>60 mm</option>
                                  <option value={80}>80 mm</option>
                                  <option value={100}>100 mm</option>
                                </select>
                              </label>
                            </div>
                            <label className="toggle-label" style={{marginTop:"4px"}}>
                              <input type="checkbox" checked={rm.showCeiling} onChange={e => updateRoom(rm.id, "showCeiling", e.target.checked)} />
                              Include Ceiling / Roof
                            </label>

                            <div className="section-subheading">🔗 Shared Walls (no extra panels)</div>
                            <p style={{fontSize:"10px",color:"var(--text-muted)",margin:"-4px 0 2px",lineHeight:"1.4"}}>
                              Mark walls that are shared with the parent building's outer walls. Shared walls won't need extra panels.
                            </p>
                            <div className="side-walls-grid">
                              {WALL_OPTIONS.map(wo => {
                                const isShared = (rm.sideWalls || []).includes(wo.value);
                                return (
                                  <button key={wo.value} className={`side-wall-btn${isShared ? " active" : ""}`}
                                    onClick={() => {
                                      const current = rm.sideWalls || [];
                                      const updated = isShared ? current.filter(w => w !== wo.value) : [...current, wo.value];
                                      updateRoom(rm.id, "sideWalls", updated);
                                    }}>
                                    {wo.label} {isShared ? "✓" : ""}
                                  </button>
                                );
                              })}
                            </div>

                            <RoomOpeningEditor openings={rm.openings || []} onAdd={addRoomOpening} onRemove={removeRoomOpening} onUpdate={updateRoomOpening} displayUnit={displayUnit} unit={unit} />
                          </div>
                        )}
                      </div>
                    ))}

                    <button className="btn btn-outline full-width add-btn" onClick={addRoom}>+ Add Internal Room</button>

                    {currentRooms.length > 0 && (
                      <div className="dim-summary" style={{marginTop:"8px"}}>
                        <span>Internal Rooms: <strong>{currentRooms.length}</strong></span>
                        <span>Partitions: <strong>{currentPartitions.length}</strong></span>
                      </div>
                    )}
                  </div>
                )}

                {step === 3 && (
                  <div className="step-content">
                    <div className="step-title">Step 3: Building Doors & Windows</div>
                    <p className="step-desc">Configure openings on the outer walls of <strong>{currentFloor?.label || "current floor"}</strong>.</p>

                    {currentOpenings.map((o, i) => (
                      <div className="partition-row" key={o.id}>
                        <div className="partition-row-header">
                          <span className="partition-number">{o.type === "door" ? "🚪" : "🪟"} Opening {i + 1}</span>
                          <button className="remove-btn" onClick={() => removeOpening(o.id)}>✕</button>
                        </div>
                        <div className="dim-row two-col">
                          <label>Label <input type="text" value={o.label} onChange={e => updateOpening(o.id, "label", e.target.value)} /></label>
                          <label>Type <select value={o.type} onChange={e => updateOpening(o.id, "type", e.target.value)}>
                            <option value="door">Door</option><option value="window">Window</option>
                          </select></label>
                          <label>Wall <select value={o.wall} onChange={e => updateOpening(o.id, "wall", e.target.value)}>
                            <option value="front">Front Wall</option><option value="back">Back Wall</option>
                            <option value="left">Left Wall</option><option value="right">Right Wall</option>
                            {currentPartitions.map((p, pi) => <option key={pi} value={`partition_${pi}`}>{p.label || `Partition ${pi+1}`}</option>)}
                          </select></label>
                          <label>Width ({displayUnit}) <input type="number" min={1} max={unit === "ft" ? 16 : 5} step={0.1} value={o.width} onChange={e => updateOpening(o.id, "width", e.target.value)} /></label>
                          <label>Height ({displayUnit}) <input type="number" min={1} max={unit === "ft" ? 16 : 5} step={0.1} value={o.height} onChange={e => updateOpening(o.id, "height", e.target.value)} /></label>
                        </div>
                      </div>
                    ))}
                    <button className="btn btn-outline full-width add-btn" onClick={addOpening}>+ Add Door / Window</button>
                    {currentOpenings.length > 0 && (
                      <div className="dim-summary" style={{marginTop:"12px"}}>
                        Total Deducted: <strong>{currentOpenings.reduce((s,o)=>s + (toM(parseFloat(o.width)||0, unit) * toM(parseFloat(o.height)||0, unit)),0).toFixed(2)} m²</strong>
                      </div>
                    )}
                  </div>
                )}

                {step === 4 && (
                  <div className="step-content">
                    <div className="step-title">Step 4: Panel Specifications</div>
                    <p className="step-desc">Configure panel specs for <strong>{currentFloor?.label || "current floor"}</strong>.</p>

                    <label>Panel Width (mm)
                      <input type="number" min={800} max={2000} step={10} value={currentFloor?.panelWidthMM || 1200} onChange={e => updateFloor(currentFloorId, "panelWidthMM", Number(e.target.value))} />
                      <span style={{fontSize:"10px",color:"var(--text-muted)",marginTop:"2px",display:"block"}}>Standard: 1200 mm</span>
                    </label>

                    <label>Panel Height ({displayUnit})
                      <span className="panel-height-display">{fmt(toM(parseFloat(currentFloor?.height) || 4, unit), unit, 2)} {displayUnit}</span>
                      <span style={{fontSize:"10px",color:"var(--text-muted)",marginTop:"2px",display:"block"}}>Auto-set from floor height</span>
                    </label>

                    <div className="field">
                      <span className="field-label">Panel Color / Finish</span>
                      <div className="color-swatches">
                        {COLOR_OPTIONS.map(c => (
                          <button key={c.hex} title={c.name} className={`swatch${(currentFloor?.panelColor || "#f5f5f5") === c.hex ? " active" : ""}`} style={{ background: c.hex }} onClick={() => updateFloor(currentFloorId, "panelColor", c.hex)} />
                        ))}
                      </div>
                      <span className="selected-color-name">Selected: {COLOR_OPTIONS.find(c => c.hex === (currentFloor?.panelColor || "#f5f5f5"))?.name}</span>
                    </div>

                    <label>Wall Panel Thickness
                      <select value={currentFloor?.wallThickness || 100} onChange={e => {
                        const newThick = Number(e.target.value);
                        updateFloor(currentFloorId, "wallThickness", newThick);
                        const recWidth = WALL_THICKNESS_RECOMMENDED_WIDTHS[newThick] || 1150;
                        updateFloor(currentFloorId, "panelWidthMM", recWidth);
                      }}>
                        <option value={50}>50 mm — Light</option>
                        <option value={60}>60 mm — Light insulation</option>
                        <option value={80}>80 mm — Standard</option>
                        <option value={100}>100 mm — Cold Room (default)</option>
                        <option value={120}>120 mm — Deep Freeze</option>
                        <option value={150}>150 mm — Heavy insulation</option>
                      </select>
                    </label>

                    <div className="panel-type-section" style={{marginTop:"6px"}}>
                      <div className="panel-type-heading">🏗️ Global Building Settings</div>
                      <p style={{fontSize:"11px",color:"var(--text-muted)",margin:"0 0 8px"}}>These settings apply to the entire building.</p>
                      <label className="toggle-label" style={{marginBottom:"8px"}}>
                        <input type="checkbox" checked={showRoof} onChange={e => setShowRoof(e.target.checked)} />
                        Include Roof in calculation & 3D view
                      </label>
                      <p style={{fontSize:"10px",color:"var(--text-muted)",margin:"4px 0 0"}}>
                        Roof type, thickness & width are configured per-floor in Step 1.
                      </p>
                    </div>

                    <div className="info-box"><strong>λ = 0.021 W/mK</strong> · Density 40±2 kg/m³ · CFC-free · Fire rated IS 12436</div>
                  </div>
                )}

                {step === 5 && (
                  <div className="step-content">
                    <div className="step-title">Step 5: Choose Panel Type</div>
                    <p className="step-desc">Select which panels you need — walls, roof, or both. This applies to the entire building.</p>

                    <div className="field">
                      <span className="field-label">Panel Type</span>
                      {PANEL_TYPE_OPTIONS.map(s => (
                        <label key={s.value} className="radio-label">
                          <input type="radio" name="pt" value={s.value} checked={panelType === s.value} onChange={() => setPanelType(s.value)} />
                          {s.label}
                        </label>
                      ))}
                    </div>

                    {!showRoof && (panelType === "roof" || panelType === "both") && (
                      <div className="info-box" style={{borderColor:"rgba(245,166,35,0.4)",color:"var(--accent)"}}>
                        ⚠️ Roof is disabled. Enable "Include Roof" in Step 4.
                      </div>
                    )}

                    <div className="panel-type-section">
                      <div className="panel-type-heading">📊 Per-Floor Wall Thickness</div>
                      {floors.map((f, i) => (
                        <div key={f.id} className="floor-thickness-row">
                          <span className="floor-color-dot" style={{background: f.panelColor || "#f5f5f5"}} />
                          <span>{f.label || `Floor ${i + 1}`}:</span>
                          <select value={f.wallThickness} onChange={e => updateFloor(f.id, "wallThickness", Number(e.target.value))} style={{width:"auto",minWidth:"120px",marginLeft:"auto"}}>
                            <option value={50}>50 mm</option><option value={60}>60 mm</option><option value={80}>80 mm</option>
                            <option value={100}>100 mm</option><option value={120}>120 mm</option>
                            <option value={150}>150 mm</option>
                          </select>
                        </div>
                      ))}
                    </div>

                    <div className="dim-summary" style={{marginTop:"4px"}}>
                      <span>Panel Type: <strong>{PANEL_TYPE_OPTIONS.find(p => p.value === panelType)?.label || panelType}</strong></span>
                      <span>Floors: <strong>{floors.length}</strong></span>
                      {showRoof && <span>Roof: <strong>Included</strong></span>}
                    </div>
                  </div>
                )}

                {step === 6 && (
                  <div className="step-content results-content">
                    <div className="step-title">📊 Panel Calculation Results</div>

                    <div className="unit-toggle" style={{marginBottom:"8px"}}>
                      <span className="field-label">View Results In</span>
                      <div className="unit-btns">
                        <button className={`unit-btn${resultsUnit === "m" ? " active" : ""}`} onClick={() => setResultsUnit("m")}>Square Meters (m²)</button>
                        <button className={`unit-btn${resultsUnit === "ft" ? " active" : ""}`} onClick={() => setResultsUnit("ft")}>Square Feet (sq. ft)</button>
                      </div>
                    </div>

                    <div className="results-summary-grid">
                      <div className="result-stat accent"><span className="rs-val">{calc.totalPanels.toFixed(3)}</span><span className="rs-label">Total Panels</span></div>
                      <div className="result-stat"><span className="rs-val">{fmt(calc.totalArea, resultsUnit === "ft" ? "ft" : "m", 1)}</span><span className="rs-label">Total Area ({resultsUnit === "ft" ? "sq. ft" : "m²"})</span></div>
                      <div className="result-stat"><span className="rs-val">{floors.length}</span><span className="rs-label">Floors</span></div>
                    </div>

                    <div className="dim-summary" style={{justifyContent:"center"}}>
                      <span>Panel Type: <strong>{PANEL_TYPE_OPTIONS.find(p => p.value === panelType)?.label || panelType}</strong></span>
                      <span>Dimensions: <strong>{fmt(lengthM, resultsUnit)} {resultsUnit === "ft" ? "ft" : "m"} × {fmt(widthM, resultsUnit)} {resultsUnit === "ft" ? "ft" : "m"} × {fmt(totalHeightM, resultsUnit)} {resultsUnit === "ft" ? "ft" : "m"}</strong></span>
                      <span>Floor Area: <strong>{fmt(lengthM * widthM, resultsUnit === "ft" ? "ft" : "m", 1)} {resultsUnit === "ft" ? "sq. ft" : "m²"} × {floors.length} floors</strong></span>
                      {showRoof && <span>Roof: <strong>Included</strong></span>}
                    </div>

                    <div className="area-breakdown">
                      <div className="area-breakdown-title">📐 Area Breakdown</div>
                      {calc.floorResults.map((fr, fi) => {
                        const wallArea = fr.wallRows.reduce((s, w) => s + w.netArea, 0) + fr.partitionRows.reduce((s, p) => s + p.netArea, 0);
                        const roomArea = fr.roomRows.reduce((s, r) => s + r.totalArea, 0);
                        const roofArea = fr.roofArea || 0;
                        const slabArea = fr.slabArea || 0;
                        const ru = resultsUnit;
                        const areaConv = ru === "ft" ? FT_PER_M * FT_PER_M : 1;
                        const al = ru === "ft" ? "sq. ft" : "m²";
                        return (
                          <div key={fi} className="area-breakdown-row">
                            <span className="area-label">{fr.label}</span>
                            <span className="area-value">🧱 Walls: <strong>{(wallArea * areaConv).toFixed(1)} {al}</strong></span>
                            <span className="area-value">🏠 Rooms: <strong>{(roomArea * areaConv).toFixed(1)} {al}</strong></span>
                            {slabArea > 0 && <span className="area-value">🔲 Floor Slab: <strong>{(slabArea * areaConv).toFixed(1)} {al}</strong></span>}
                            {roofArea > 0 && <span className="area-value">🟠 Roof: <strong>{(roofArea * areaConv).toFixed(1)} {al}</strong></span>}
                          </div>
                        );
                      })}
                    </div>

                    <div className="results-table-wrap">
                      {calc.floorResults.map((fr, fi) => {
                        const ru = resultsUnit;
                        const areaConv = ru === "ft" ? FT_PER_M * FT_PER_M : 1;
                        const al = ru === "ft" ? "sq. ft" : "m²";
                        return (
                          <div key={fi} className="floor-result-section">
                            <div className="floor-result-header">
                              <span className="floor-color-dot" style={{background: fr.panelColor}} />
                              <strong>{fr.label}</strong>
                              <span style={{marginLeft:"auto",fontSize:"11px",color:"var(--text-muted)"}}>{fr.floorPanels.toFixed(3)} panels · {(fr.floorArea * areaConv).toFixed(1)} {al}</span>
                            </div>
                            <table className="calc-table">
                              <thead><tr><th>Component</th><th>Thickness</th><th>Gross {al}</th><th>Net {al}</th><th>Panels</th></tr></thead>
                              <tbody>
                                {fr.wallRows.map(w => (
                                  <tr key={w.id}><td>{w.label.replace(`${fr.label} - `, "")}</td><td>{fr.wallThickness} mm</td><td>{(w.grossArea * areaConv).toFixed(1)}</td><td>{(w.netArea * areaConv).toFixed(1)}</td><td><strong>{w.panelCount.toFixed(3)}</strong></td></tr>
                                ))}
                                {fr.partitionRows.map((p, pi) => (
                                  <tr key={`p-${pi}`}><td style={{color:"var(--primary-light)"}}>{p.label}</td><td>{p.wallThickness || 80} mm</td><td>{(p.grossArea * areaConv).toFixed(1)}</td><td>{(p.netArea * areaConv).toFixed(1)}</td><td><strong>{p.panelCount.toFixed(3)}</strong></td></tr>
                                ))}
                                {(fr.roomRows || []).map((rm, ri) => (
                                  <tr key={`rm-${ri}`}><td style={{color:"var(--accent)"}}>🏠 {rm.label}</td><td>{(rm.totalArea * areaConv).toFixed(1)}</td><td>{(rm.totalArea * areaConv).toFixed(1)}</td><td><strong>{rm.totalPanels.toFixed(3)}</strong></td></tr>
                                ))}
                                {fr.slabArea > 0 && (
                                  <tr><td style={{color:"var(--accent)"}}>🔲 Floor Slab</td><td>{(fr.slabArea * areaConv).toFixed(1)}</td><td>{(fr.slabArea * areaConv).toFixed(1)}</td><td><strong>{fr.slabPanelCount.toFixed(3)}</strong></td></tr>
                                )}
                                {fr.roofArea > 0 && (
                                  <tr><td style={{color:"var(--accent)"}}>🟠 Roof{fr.floorRoofType ? ` (${ROOF_TYPE_OPTIONS.find(r => r.value === fr.floorRoofType)?.label?.replace(/\(\d+ mm\)/, `(${fr.floorRoofThickness} mm)`) || fr.floorRoofType})` : ""}</td><td>{(fr.roofArea * areaConv).toFixed(1)}</td><td>{(fr.roofArea * areaConv).toFixed(1)}</td><td><strong>{fr.roofPanelCount.toFixed(3)}</strong></td></tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        );
                      })}
                    </div>

                    <button className="btn btn-primary full-width quote-btn" onClick={() => setQuoteOpen(true)}>📄 Generate Full Quote Summary</button>
                  </div>
                )}

                <div className="step-nav">
                  {step > 1 && <button className="btn btn-outline" onClick={prev}>← Back</button>}
                  {step < 6 && <button className="btn btn-primary" onClick={next}>{step === 5 ? "Calculate →" : "Next →"}</button>}
                  {step === 6 && <button className="btn btn-outline" onClick={() => setStep(1)}>↺ Start Over</button>}
                </div>
              </div>
            </aside>

            <main className="canvas-area">
              <div className="canvas-stats" aria-live="polite">
                <span className="stat-chip floors"><strong>{floors.length}</strong> Floor{floors.length !== 1 ? "s" : ""}</span>
                <span className="stat-chip rooms"><strong>{roomCount}</strong> Room{roomCount !== 1 ? "s" : ""}</span>
                <span className="stat-chip partitions"><strong>{partitionCount}</strong> Partition{partitionCount !== 1 ? "s" : ""}</span>
                <span className="stat-chip doors"><strong>{doorCount}</strong> Door{doorCount !== 1 ? "s" : ""}</span>
                <span className="stat-chip windows"><strong>{windowCount}</strong> Window{windowCount !== 1 ? "s" : ""}</span>
              </div>

              <Canvas shadows camera={{ position: [lengthM * 1.6, totalHeightM * 1.2 + 4, widthM * 2 + 4], fov: 45 }} gl={{ antialias: true }}>
                <Scene length={lengthM} width={widthM} floors={floors} showRoof={showRoof} unit={unit} panelType={panelType} />
              </Canvas>

              <div className="canvas-hint">🖱️ Drag to orbit · Scroll to zoom · Right-click to pan</div>
            </main>

            <QuoteModal
              open={quoteOpen}
              onClose={() => setQuoteOpen(false)}
              config={{ length: lengthM, width: widthM, totalHeight: totalHeightM, displayLength: length, displayWidth: width,
                displayTotalHeight: fmt(totalHeightM, unit, 1), structureType, showRoof, roofType, roofThickness, roofWidth, unit, panelType, floors: floors.length, panelWidthMM: floors[0]?.panelWidthMM || 1200, panelThickness: floors[0]?.wallThickness || 100 }}
              calc={calc}
              floors={floors}
              unit={unit}
              displayUnit={displayUnit}
              resultsUnit={resultsUnit}
              COLOR_OPTIONS={COLOR_OPTIONS}
              STRUCTURE_TYPES={STRUCTURE_TYPES}
              ROOF_TYPE_OPTIONS={ROOF_TYPE_OPTIONS}
            />

            <button className="logout-btn" onClick={handleLogout} title="Logout">Logout</button>
          </div>
          </ProtectedRoute>
        } />
        </>
      ) : (
        <Route path="*" element={<Login onLogin={handleLogin} />} />
      )}
    </Routes>
  );
}

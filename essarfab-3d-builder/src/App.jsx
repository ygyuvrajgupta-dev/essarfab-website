import { useState } from "react";                                                       //cd essarfab-3d-builder
import { Canvas } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import {
  OrbitControls,
  Grid,
  Environment,
  Bounds
} from "@react-three/drei";
import Panel from "./components/Panel";
import CornerTrim from "./components/CornerTrim";
import Door from "./components/Door";
export default function App() {
  const [length, setLength] = useState(10);
  const [width, setWidth] = useState(8);
  const [height, setHeight] = useState(4);
  const [panelThickness, setPanelThickness] = useState(100);

  const thickness = panelThickness / 1000;

  const wallArea = 2 * (length * height) + 2 * (width * height);
  const roofArea = length * width;
  const totalArea = wallArea + roofArea;

  return (
    <>
      {/* Controls */}
      <div
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          background: "white",
          padding: "15px",
          borderRadius: "10px",
          zIndex: 1000,
        }}
      >
        <h3>ESSARFAB Cold Room Builder</h3>

        <div>
          Length (m):
          <input
            type="number"
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            style={{
              width: "80px",
              marginLeft: "10px",
              marginBottom: "8px"
            }}
          />
        </div>

        <div>
          Width (m):
          <input
            type="number"
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            style={{
              width: "80px",
              marginLeft: "10px",
              marginBottom: "8px"
            }}
          />
        </div>

        <div>
          Height (m):
          <input
            type="number"
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
            style={{
              width: "80px",
              marginLeft: "10px",
              marginBottom: "8px"
            }}
          />
        </div>
        <div>
          Panel Thickness:
          <select
            value={panelThickness}
            onChange={(e) => setPanelThickness(Number(e.target.value))}
          >
            <option value={60}>60 mm</option>
            <option value={80}>80 mm</option>
            <option value={100}>100 mm</option>
            <option value={120}>120 mm</option>
            <option value={150}>150 mm</option>
          </select>
        </div>

        <hr />

        <p>Wall Area: {wallArea.toFixed(2)} m²</p>
        <p>Roof Area: {roofArea.toFixed(2)} m²</p>
        <h4>Total Panel Area: {totalArea.toFixed(2)} m²</h4>
        <p>Selected Thickness: {panelThickness} mm</p>
      </div>

      <Canvas
  shadows
  camera={{ position: [16, 10, 16], fov: 40 }}
>
  {/* Sky Background */}
  <color attach="background" args={["#9fd3ff"]} />

  {/* Lights */}
  <ambientLight intensity={0.7} />

  <directionalLight
    position={[20, 20, 20]}
    intensity={2.5}
    castShadow
    shadow-mapSize-width={2048}
    shadow-mapSize-height={2048}
  />

  <directionalLight
    position={[-20, 10, -20]}
    intensity={0.8}
  />

  {/* Environment */}
  <Environment preset="sunset" />

  {/* Controls */}
  <OrbitControls
    makeDefault
    target={[0, height / 2, 0]}
    minDistance={5}
    maxDistance={50}
    maxPolarAngle={Math.PI / 2.1}
  />

  {/* Grid */}
  <Grid infiniteGrid />

  {/* Front Wall */}
  <Panel
    position={[0, height / 2, width / 2]}
    size={[length, height, thickness]}
  />

  {/* Back Wall */}
  <Panel
    position={[0, height / 2, -width / 2]}
    size={[length, height, thickness]}
  />

  {/* Left Wall */}
  <Panel
    position={[-length / 2, height / 2, 0]}
    rotation={[0, Math.PI / 2, 0]}
    size={[width, height, thickness]}
  />

  {/* Right Wall */}
  <Panel
    position={[length / 2, height / 2, 0]}
    rotation={[0, Math.PI / 2, 0]}
    size={[width, height, thickness]}
  />

  {/* Roof */}
  <Panel
    position={[0, height, 0]}
    rotation={[Math.PI / 2, 0, 0]}
    size={[length, width, thickness]}
  />

  {/* Corner Trims */}

  {/* Front Left */}
  <CornerTrim
    position={[-length / 2, height / 2, width / 2]}
    height={height}
  />

  {/* Front Right */}
  <CornerTrim
    position={[length / 2, height / 2, width / 2]}
    height={height}
  />

  {/* Back Left */}
  <CornerTrim
    position={[-length / 2, height / 2, -width / 2]}
    height={height}
  />

  {/* Back Right */}
  <CornerTrim
    position={[length / 2, height / 2, -width / 2]}
    height={height}
  />

  {/* Door */}
  <Door width={width} />
</Canvas>
    </>
  );
}
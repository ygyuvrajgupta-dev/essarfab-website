import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";

function Panel({ position, rotation = [0, 0, 0], size }) {
  return (
    <group position={position} rotation={rotation}>

      {/* Main panel */}
      <mesh>
        <boxGeometry args={size} />
        <meshStandardMaterial color="#f5f5f5" />
      </mesh>

      {/* Vertical joint lines */}
      {Array.from(
        { length: Math.floor(size[0] / 1.2) },
        (_, i) => (
          <mesh
            key={i}
            position={[
              -size[0] / 2 + (i + 1) * 1.2,
              0,
              size[2] / 2 + 0.001
            ]}
          >
            <boxGeometry args={[0.03, size[1], 0.01]} />
            <meshStandardMaterial color="#1f6e43" />
          </mesh>
        )
      )}
    </group>
  );
}

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

      <Canvas camera={{ position: [15, 10, 15], fov: 50 }}>
        <ambientLight intensity={3} />
        <directionalLight position={[10, 10, 10]} intensity={5} />

        <OrbitControls />
        <Grid infiniteGrid />

        {/* Front */}
        <Panel
          position={[0, height / 2, width / 2]}
          size={[length, height, thickness]}
        />

        {/* Back */}
        <Panel
          position={[0, height / 2, -width / 2]}
          size={[length, height, thickness]}
        />

        {/* Left */}
        <Panel
          position={[-length / 2, height / 2, 0]}
          rotation={[0, Math.PI / 2, 0]}
          size={[width, height, thickness]}
        />

        {/* Right */}
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

        {/* Door */}
        <mesh position={[0, 1.2, width / 2 + 0.08]}>
          <boxGeometry args={[1.2, 2.4, 0.1]} />
          <meshStandardMaterial color="#cccccc" />
        </mesh>
      </Canvas>
    </>
  );
}
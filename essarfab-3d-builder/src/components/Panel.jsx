import { useState } from "react";

function Panel({ position, rotation = [0, 0, 0], size, color = "#f5f5f5", panelWidth = 1.2, onClick, isSelected, wallId }) {
  const [w, h, d] = size;
  const jointCount = Math.max(0, Math.floor(w / panelWidth) - 1);
  const [hovered, setHovered] = useState(false);

  const matColor = isSelected ? "#f5a623" : hovered ? "#d4a853" : color;

  return (
    <group position={position} rotation={rotation}>
      {/* Main panel body */}
      <mesh
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          if (onClick && wallId) onClick(wallId);
        }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = "auto"; }}
      >
        <boxGeometry args={[w, h, d]} />
        <meshPhysicalMaterial
          color={matColor}
          roughness={isSelected ? 0.2 : 0.3}
          metalness={isSelected ? 0.4 : 0.22}
          reflectivity={isSelected ? 0.6 : 0.4}
          emissive={isSelected ? "#f5a623" : "#000000"}
          emissiveIntensity={isSelected ? 0.15 : 0}
        />
      </mesh>

      {/* Selection outline */}
      {isSelected && (
        <mesh>
          <boxGeometry args={[w + 0.02, h + 0.02, d + 0.02]} />
          <meshBasicMaterial color="#f5a623" transparent opacity={0.25} side={1} />
        </mesh>
      )}

      {/* Vertical joint lines (front face) */}
      {Array.from({ length: jointCount }, (_, i) => (
        <mesh key={i} position={[-w / 2 + (i + 1) * panelWidth, 0, d / 2 + 0.001]}>
          <boxGeometry args={[0.025, h, 0.008]} />
          <meshStandardMaterial color="#0b5d3b" />
        </mesh>
      ))}

      {/* Horizontal seam at half height */}
      <mesh position={[0, 0, d / 2 + 0.0005]}>
        <boxGeometry args={[w, 0.012, 0.006]} />
        <meshStandardMaterial color="#0a3b2f" />
      </mesh>
    </group>
  );
}

export default Panel;
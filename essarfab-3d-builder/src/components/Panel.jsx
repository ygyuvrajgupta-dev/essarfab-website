function Panel({ position, rotation = [0, 0, 0], size, color = "#f5f5f5", panelWidth = 1.2 }) {
  const [w, h, d] = size;
  const jointCount = Math.max(0, Math.floor(w / panelWidth) - 1);

  return (
    <group position={position} rotation={rotation}>
      {/* Main panel body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshPhysicalMaterial color={color} roughness={0.3} metalness={0.22} reflectivity={0.4} />
      </mesh>

      {/* Vertical joint lines (front face) */}
      {Array.from({ length: jointCount }, (_, i) => (
        <mesh key={i} position={[-w / 2 + (i + 1) * panelWidth, 0, d / 2 + 0.001]}>
          <boxGeometry args={[0.025, h, 0.008]} />
          <meshStandardMaterial color="#0b5d3b" />
        </mesh>
      ))}

      {/* Horizontal seam at half height (top/bottom trim line) */}
      <mesh position={[0, 0, d / 2 + 0.0005]}>
        <boxGeometry args={[w, 0.012, 0.006]} />
        <meshStandardMaterial color="#0a3b2f" />
      </mesh>
    </group>
  );
}

export default Panel;

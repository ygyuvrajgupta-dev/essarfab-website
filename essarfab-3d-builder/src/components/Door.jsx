function Door({ position, rotation = [0, 0, 0], doorWidth = 1.2, doorHeight = 2.1, color = "#f5f5f5", thickness = 0.1 }) {
  const fw = 0.06; // frame width
  const fd = thickness + 0.02;

  return (
    <group position={position} rotation={rotation}>
      {/* Door frame — top */}
      <mesh position={[0, doorHeight - fw / 2, 0]}>
        <boxGeometry args={[doorWidth + fw * 2, fw, fd]} />
        <meshStandardMaterial color="#0b5d3b" metalness={0.5} roughness={0.3} />
      </mesh>
      {/* Frame — left */}
      <mesh position={[-doorWidth / 2 - fw / 2, doorHeight / 2, 0]}>
        <boxGeometry args={[fw, doorHeight, fd]} />
        <meshStandardMaterial color="#0b5d3b" metalness={0.5} roughness={0.3} />
      </mesh>
      {/* Frame — right */}
      <mesh position={[doorWidth / 2 + fw / 2, doorHeight / 2, 0]}>
        <boxGeometry args={[fw, doorHeight, fd]} />
        <meshStandardMaterial color="#0b5d3b" metalness={0.5} roughness={0.3} />
      </mesh>

      {/* Door leaf */}
      <mesh position={[0, doorHeight / 2, 0]} castShadow>
        <boxGeometry args={[doorWidth, doorHeight, thickness * 0.9]} />
        <meshPhysicalMaterial color={color} roughness={0.35} metalness={0.2} />
      </mesh>

      {/* Handle */}
      <mesh position={[doorWidth / 2 - 0.12, doorHeight / 2, thickness * 0.5 + 0.03]}>
        <sphereGeometry args={[0.04, 12, 12]} />
        <meshStandardMaterial color="#888" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  );
}

export default Door;

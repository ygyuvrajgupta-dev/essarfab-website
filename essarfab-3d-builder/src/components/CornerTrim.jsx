function CornerTrim({ position, height }) {
  return (
    <mesh position={position} castShadow>
      <boxGeometry args={[0.08, height, 0.08]} />
      <meshStandardMaterial color="#0a3b2f" metalness={0.6} roughness={0.2} />
    </mesh>
  );
}

export default CornerTrim;

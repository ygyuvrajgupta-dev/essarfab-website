function FloorSlab({ length, width }) {
  return (
    <mesh position={[0, -0.025, 0]} receiveShadow>
      <boxGeometry args={[length + 0.3, 0.05, width + 0.3]} />
      <meshStandardMaterial color="#1a2a1a" roughness={0.9} metalness={0.05} />
    </mesh>
  );
}

export default FloorSlab;

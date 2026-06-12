function Door({ width }) {
    return (
      <mesh
        position={[0, 1.2, width / 2 + 0.08]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1.2, 2.4, 0.1]} />
        <meshStandardMaterial color="#cccccc" />
      </mesh>
    );
  }
  
  export default Door;
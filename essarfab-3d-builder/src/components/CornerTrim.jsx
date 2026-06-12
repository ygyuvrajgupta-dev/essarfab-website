function CornerTrim({ position, height }) {
    return (
      <mesh position={position}>
        <boxGeometry args={[0.1, height, 0.1]} />
        <meshStandardMaterial color="#0b5d3b" />
      </mesh>
    );
  }
  
  export default CornerTrim;
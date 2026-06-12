function Panel({ position, rotation = [0, 0, 0], size }) {
    return (
      <group position={position} rotation={rotation}>
  
        {/* Main panel */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={size} />
          <meshPhysicalMaterial
            color="#f8f8f8"
            roughness={0.25}
            metalness={0.15}
          />
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
              <meshStandardMaterial color="#0b5d3b" />
            </mesh>
          )
        )}
      </group>
    );
  }
  
  export default Panel;
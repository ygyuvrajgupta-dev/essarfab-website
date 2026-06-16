function Window({
  position,
  rotation = [0, 0, 0],
  windowWidth = 1.2,
  windowHeight = 1.0,
  sillHeight = 1.0,
  thickness = 0.1,
}) {
  const fw = 0.05;
  const fd = thickness + 0.02;
  const centerY = sillHeight + windowHeight / 2;

  return (
    <group position={position} rotation={rotation}>
      {/* Frame — top */}
      <mesh position={[0, centerY + windowHeight / 2 + fw / 2, 0]}>
        <boxGeometry args={[windowWidth + fw * 2, fw, fd]} />
        <meshStandardMaterial color="#1565c0" metalness={0.45} roughness={0.35} />
      </mesh>
      {/* Frame — bottom sill */}
      <mesh position={[0, sillHeight - fw / 2, 0]}>
        <boxGeometry args={[windowWidth + fw * 2, fw, fd]} />
        <meshStandardMaterial color="#1565c0" metalness={0.45} roughness={0.35} />
      </mesh>
      {/* Frame — left */}
      <mesh position={[-windowWidth / 2 - fw / 2, centerY, 0]}>
        <boxGeometry args={[fw, windowHeight, fd]} />
        <meshStandardMaterial color="#1565c0" metalness={0.45} roughness={0.35} />
      </mesh>
      {/* Frame — right */}
      <mesh position={[windowWidth / 2 + fw / 2, centerY, 0]}>
        <boxGeometry args={[fw, windowHeight, fd]} />
        <meshStandardMaterial color="#1565c0" metalness={0.45} roughness={0.35} />
      </mesh>
      {/* Mullion */}
      <mesh position={[0, centerY, 0]}>
        <boxGeometry args={[fw * 0.8, windowHeight, fd * 0.6]} />
        <meshStandardMaterial color="#0d47a1" metalness={0.5} roughness={0.3} />
      </mesh>

      {/* Glass panes */}
      {[-windowWidth / 4, windowWidth / 4].map((x, i) => (
        <mesh key={i} position={[x, centerY, 0]}>
          <boxGeometry args={[windowWidth / 2 - fw, windowHeight - fw, thickness * 0.35]} />
          <meshPhysicalMaterial
            color="#b3e5fc"
            transparent
            opacity={0.55}
            roughness={0.05}
            metalness={0.1}
            transmission={0.85}
            thickness={0.02}
          />
        </mesh>
      ))}
    </group>
  );
}

export default Window;

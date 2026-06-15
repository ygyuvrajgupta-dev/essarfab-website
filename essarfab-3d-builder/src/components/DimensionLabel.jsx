import { Text } from "@react-three/drei";

function DimensionLabel({ position, text, color = "#f5a623", fontSize = 0.35 }) {
  return (
    <Text
      position={position}
      color={color}
      fontSize={fontSize}
      anchorX="center"
      anchorY="middle"
      outlineWidth={0.02}
      outlineColor="#000000"
    >
      {text}
    </Text>
  );
}

export default DimensionLabel;

/** Spread openings evenly along a wall span. */
export function layoutAlongWall(items, span) {
  if (!items.length) return [];
  const step = span / (items.length + 1);
  return items.map((item, i) => ({
    item,
    offset: -span / 2 + step * (i + 1),
  }));
}

/**
 * Partition positions inside the room.
 * Each partition has: positionX, positionZ, rotationDeg (0-360 degrees).
 * 0° = along X-axis, 90° = along Z-axis, any angle in between.
 *
 * Position is clamped so the ENTIRE partition wall stays inside the building footprint.
 */
export function getPartitionLayouts(partitions, length, width, height) {
  if (!partitions.length) return [];

  return partitions.map((p, i) => {
    const posX = p.positionX !== undefined && p.positionX !== "" ? parseFloat(p.positionX) : null;
    const posZ = p.positionZ !== undefined && p.positionZ !== "" ? parseFloat(p.positionZ) : null;
    const rotDeg = parseFloat(p.rotationDeg) || 0;
    const rad = (rotDeg * Math.PI) / 180;

    const wallLen = Math.min(parseFloat(p.length) || length, Math.max(length, width));
    const wallH = parseFloat(p.height) || height;

    // Half-length of the wall
    const halfLen = wallLen / 2;

    // For a rotated wall, the bounding box half-extent along X and Z axes:
    // The wall spans from center ± halfLen along its local axis.
    // In world coords, the extent along X is halfLen * |cos(rad)| and along Z is halfLen * |sin(rad)|.
    // But since the wall is a line (not a rectangle), we only need to ensure the wall endpoints
    // stay within bounds. The endpoints are at:
    //   (x ± halfLen * cos(rad), z ± halfLen * sin(rad))
    // So the center must be clamped so that both endpoints stay within [-L/2, L/2] and [-W/2, W/2].
    // This gives: |x| <= L/2 - halfLen * |cos(rad)| and |z| <= W/2 - halfLen * |sin(rad)|
    const extentX = halfLen * Math.abs(Math.cos(rad));
    const extentZ = halfLen * Math.abs(Math.sin(rad));

    const maxX = length / 2 - extentX;
    const maxZ = width / 2 - extentZ;
    const margin = 0.15;

    // Auto-place if no position given
    const count = partitions.length;
    const defaultX = posX !== null ? posX : (-length / 2 + ((i + 1) * length) / (count + 1));
    const defaultZ = posZ !== null ? posZ : (-width / 2 + ((i + 1) * width) / (count + 1));

    // Clamp so the entire wall stays inside the building
    const clampedX = Math.max(-maxX + margin, Math.min(maxX - margin, parseFloat(defaultX) || 0));
    const clampedZ = Math.max(-maxZ + margin, Math.min(maxZ - margin, parseFloat(defaultZ) || 0));

    return { partition: p, index: i, wallLen, wallH, x: clampedX, z: clampedZ, rotationDeg: rotDeg, rad };
  });
}

/**
 * Resolve 3D transform for an opening on outer walls or partition walls.
 * Returns { position, rotation } for R3F groups.
 */
export function getOpeningTransform(opening, layout, { length, width, thickness, offset }) {
  const doorW = parseFloat(opening.width) || 1.2;
  const doorH = parseFloat(opening.height) || (opening.type === "door" ? 2.1 : 1.0);
  const sill = opening.type === "window" ? Math.min(1.0, Math.max(0.6, (layout?.wallH || 4) - doorH - 0.3)) : 0;
  const y = opening.type === "door" ? doorH / 2 : sill + doorH / 2;
  const inset = thickness / 2 + 0.02;

  const wall = opening.wall;

  if (wall === "front") {
    return { position: [offset, y, width / 2 + inset], rotation: [0, 0, 0], width: doorW, height: doorH, sill };
  }
  if (wall === "back") {
    return { position: [offset, y, -width / 2 - inset], rotation: [0, Math.PI, 0], width: doorW, height: doorH, sill };
  }
  if (wall === "left") {
    return { position: [-length / 2 - inset, y, offset], rotation: [0, -Math.PI / 2, 0], width: doorW, height: doorH, sill };
  }
  if (wall === "right") {
    return { position: [length / 2 + inset, y, offset], rotation: [0, Math.PI / 2, 0], width: doorW, height: doorH, sill };
  }

  const partMatch = wall.match(/^partition_(\d+)$/);
  if (partMatch && layout) {
    const { x, z, wallLen, rad } = layout;
    const clampedOffset = Math.max(-wallLen / 2 + doorW / 2, Math.min(wallLen / 2 - doorW / 2, offset));
    const worldX = x + clampedOffset * Math.cos(rad) + inset * Math.sin(rad);
    const worldZ = z + clampedOffset * Math.sin(rad) + inset * Math.cos(rad);
    return {
      position: [worldX, y, worldZ],
      rotation: [0, rad, 0],
      width: doorW,
      height: doorH,
      sill,
    };
  }

  // Room partition openings (used by InternalRoom3D)
  const roomPartMatch = wall.match(/^room(\d+)_partition_(\d+)$/);
  if (roomPartMatch && layout) {
    const { x, z, wallLen, rad } = layout;
    const clampedOffset = Math.max(-wallLen / 2 + doorW / 2, Math.min(wallLen / 2 - doorW / 2, offset));
    const worldX = x + clampedOffset * Math.cos(rad) + inset * Math.sin(rad);
    const worldZ = z + clampedOffset * Math.sin(rad) + inset * Math.cos(rad);
    return {
      position: [worldX, y, worldZ],
      rotation: [0, rad, 0],
      width: doorW,
      height: doorH,
      sill,
    };
  }

  return null;
}

/** Group openings by wall id for layout. */
export function groupOpeningsByWall(openings) {
  return openings.reduce((acc, o) => {
    const key = o.wall || "front";
    if (!acc[key]) acc[key] = [];
    acc[key].push(o);
    return acc;
  }, {});
}
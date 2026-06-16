/** Spread openings evenly along a wall span. */
export function layoutAlongWall(items, span) {
  if (!items.length) return [];
  const step = span / (items.length + 1);
  return items.map((item, i) => ({
    item,
    offset: -span / 2 + step * (i + 1),
  }));
}

/** Partition positions inside the room (walls run along X, placed across Z). */
export function getPartitionLayouts(partitions, length, width, height) {
  const count = partitions.length;
  if (!count) return [];

  return partitions.map((p, i) => {
    const wallLen = Math.min(parseFloat(p.length) || length, length);
    const wallH = parseFloat(p.height) || height;
    const z = -width / 2 + ((i + 1) * width) / (count + 1);
    return { partition: p, index: i, wallLen, wallH, z };
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
    const { z, wallLen } = layout;
    const clampedOffset = Math.max(-wallLen / 2 + doorW / 2, Math.min(wallLen / 2 - doorW / 2, offset));
    return {
      position: [clampedOffset, y, z + inset],
      rotation: [0, 0, 0],
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

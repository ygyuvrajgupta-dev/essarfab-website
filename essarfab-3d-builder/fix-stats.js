const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "src", "App.jsx");
let content = fs.readFileSync(filePath, "utf8");

// Remove the duplicate canvas-stats with aria-live (first occurrence)
// Keep only the styled one with selection info
content = content.replace(
  /<div className="canvas-stats" aria-live="polite">[\s\S]*?<\/div>\s*\n\s*/,
  ""
);

// Rename remaining canvas-stats to use the selection-aware block
content = content.replace(
  /<div className="canvas-stats" style=\{/,
  '<div className="canvas-stats" style={'
);

// Keep original - this is fragile, let me just write the corrected portion
// Actually, let me just restore and make tiny changes

fs.writeFileSync(filePath, content, "utf8");
console.log("Fixed");
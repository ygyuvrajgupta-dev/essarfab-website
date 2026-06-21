import { useEffect } from "react";

const FT_PER_M = 3.28084;

function getAreaInUnit(areaM2, unit) {
  return unit === "ft" ? areaM2 * FT_PER_M * FT_PER_M : areaM2;
}

function QuoteModal({ open, onClose, config, calc, floors, unit, displayUnit, COLOR_OPTIONS, STRUCTURE_TYPES, ROOF_TYPE_OPTIONS }) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const structName = STRUCTURE_TYPES?.find(s => s.value === config.structureType)?.label || config.structureType;
  const du = displayUnit || "m";
  const au = unit === "m" ? "m²" : "sq. ft";

  const displayL = config.displayLength ?? config.length;
  const displayW = config.displayWidth ?? config.width;
  const displayH = config.displayTotalHeight ?? (config.totalHeight ? (unit === "m" ? config.totalHeight.toFixed(1) : (config.totalHeight * FT_PER_M).toFixed(1)) : "—");

  const floorCount = config.floors || floors?.length || 1;

  const handleCopy = () => {
    const lines = [
      "════════════════════════════════════════",
      "   ESSARFAB GREEN INDIA PVT LTD",
      "   PUF Panel Estimation — Quote Summary",
      "════════════════════════════════════════",
      "",
      `Project Type        : ${structName}`,
      `Dimensions          : ${displayL}${du} (L) × ${displayW}${du} (W) × ${displayH}${du} (H)`,
      `Floors              : ${floorCount}`,
      `Floor Area (each)   : ${getAreaInUnit(config.length * config.width, unit).toFixed(2)} ${au}`,
      `Total Floor Area    : ${getAreaInUnit(config.length * config.width * floorCount, unit).toFixed(2)} ${au}`,
      `Include Roof        : ${config.showRoof ? "Yes (see per-floor details below)" : "No"}`,
      `Panel Type          : ${config.panelType || "both"}`,
      "",
      "── Per-Floor Breakdown ────────────────────",
      ...(calc.floorResults || []).flatMap((fr, fi) => {
        const roofLines = fr.roofArea > 0 && fr.floorRoofType ? [
          `    Roof Type:      ${ROOF_TYPE_OPTIONS?.find(r => r.value === fr.floorRoofType)?.label || fr.floorRoofType}`,
          `    Roof Thickness: ${fr.floorRoofThickness || 100} mm`,
          `    Roof Width:     ${fr.floorRoofWidth || 1150} mm`,
          `    Roof Panels:    ${fr.roofPanelCount} panels · ${fr.roofArea.toFixed(2)} ${au}`,
        ] : [];
        return [
          `  ${fr.label || `Floor ${fi + 1}`}:`,
          `    Wall Panels:    ${fr.floorPanels} panels · ${fr.floorArea.toFixed(2)} ${au}`,
          `    Wall Color:     ${COLOR_OPTIONS?.find(c => c.hex === fr.panelColor)?.name || fr.panelColor}`,
          `    Wall Thickness: ${fr.wallThickness} mm`,
          ...roofLines,
          "",
        ];
      }),
      "── Summary ──────────────────────────────",
      `Total Panels       : ${calc.totalPanels}`,
      `Total Panel Area   : ${calc.totalArea.toFixed(2)} ${au}`,
      `Number of Floors   : ${floorCount}`,
      "",
      "════════════════════════════════════════",
      "Contact: +91-98387 00617",
      "WhatsApp: +91-80528 75755",
      "Email: infoessarfabgreen@gmail.com",
      "www.essarfabgreenindia.com",
      "════════════════════════════════════════",
    ];
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      alert("Quote summary copied to clipboard!");
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <div>
            <div className="modal-brand">ESSARFAB</div>
            <div className="modal-subtitle">PUF Panel Estimation — Multi-Floor Quote Summary</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" id="quote-print-area">

          {/* Project Info */}
          <section>
            <h4>Project Details</h4>
            <table className="quote-table">
              <tbody>
                <tr><td>Project Type</td><td>{structName}</td></tr>
                <tr><td>Dimensions (L × W × H)</td><td>{displayL}{du} × {displayW}{du} × {displayH}{du}</td></tr>
                <tr><td>Number of Floors</td><td><strong>{floorCount}</strong></td></tr>
                <tr><td>Floor Area (per floor)</td><td>{getAreaInUnit(config.length * config.width, unit).toFixed(2)} {au}</td></tr>
                <tr><td>Total Floor Area</td><td>{getAreaInUnit(config.length * config.width * floorCount, unit).toFixed(2)} {au}</td></tr>
                <tr><td>Roof Panels</td><td>{config.showRoof ? "Included (see per-floor details)" : "Not included"}</td></tr>
                {config.showRoof && (
                  <>
                    <tr><td>Roof Type</td><td>{ROOF_TYPE_OPTIONS?.find(r => r.value === config.roofType)?.label || config.roofType || "Sandwich Panel"}</td></tr>
                    <tr><td>Roof Thickness</td><td>{config.roofThickness || 100} mm</td></tr>
                    <tr><td>Roof Panel Width</td><td>{config.roofWidth || 1150} mm</td></tr>
                  </>
                )}
                <tr><td>Panel Type</td><td>{config.panelType || "both"}</td></tr>
              </tbody>
            </table>
          </section>

          {/* Per-floor breakdown */}
          {(calc.floorResults || []).map((fr, fi) => {
            const colorName = COLOR_OPTIONS?.find(c => c.hex === fr.panelColor)?.name || fr.panelColor;
            return (
              <section key={fi}>
                <h4>
                  <span className="color-dot" style={{ background: fr.panelColor || "#f5f5f5" }} />
                  {fr.label || `Floor ${fi + 1}`}
                  <span style={{ fontSize: "11px", fontWeight: 400, color: "var(--text-muted)", marginLeft: "8px" }}>
                    {fr.floorPanels} panels · {fr.floorArea.toFixed(2)} {au}
                  </span>
                </h4>
                <table className="quote-table">
                  <thead>
                    <tr><th>Component</th><th>Thickness</th><th>Gross {au}</th><th>Net {au}</th><th>Panels</th></tr>
                  </thead>
                  <tbody>
                    {fr.wallRows.map(w => (
                      <tr key={w.id}>
                        <td>{w.label.replace(`${fr.label} - `, "")}</td>
                        <td>{fr.wallThickness} mm</td>
                        <td>{w.grossArea.toFixed(2)}</td>
                        <td>{w.netArea.toFixed(2)}</td>
                        <td><strong>{w.panelCount}</strong></td>
                      </tr>
                    ))}
                    {fr.partitionRows.map((p, pi) => (
                      <tr key={`p-${pi}`}>
                        <td style={{ color: "var(--primary-light)" }}>{p.label}</td>
                        <td>{p.wallThickness || 80} mm</td>
                        <td>{p.grossArea.toFixed(2)}</td>
                        <td>{p.netArea.toFixed(2)}</td>
                        <td><strong>{p.panelCount}</strong></td>
                      </tr>
                    ))}
                    {fr.roofArea > 0 && (
                      <tr>
                        <td style={{ color: "var(--accent)" }}>🟠 Roof</td>
                        <td>{fr.roofArea.toFixed(2)}</td>
                        <td>{fr.roofArea.toFixed(2)}</td>
                        <td><strong>{fr.roofPanelCount}</strong></td>
                      </tr>
                    )}
                    <tr className="total-row">
                      <td><strong>Floor Totals</strong></td>
                      <td><strong>{fr.floorArea.toFixed(2)}</strong></td>
                      <td><strong>{fr.floorArea.toFixed(2)}</strong></td>
                      <td><strong>{fr.floorPanels}</strong></td>
                    </tr>
                  </tbody>
                </table>
                <table className="quote-table" style={{ marginTop: "4px" }}>
                  <tbody>
                    <tr><td style={{ width: "140px" }}>Wall Color</td><td><span className="color-dot" style={{ background: fr.panelColor }} /> {colorName}</td></tr>
                    <tr><td>Wall Thickness</td><td>{fr.wallThickness} mm</td></tr>
                    <tr><td>Panel Width</td><td>{fr.panelWidthMM || 1200} mm</td></tr>
                    {fr.roofArea > 0 && fr.floorRoofType && (
                      <>
                        <tr><td>Roof Type</td><td>{ROOF_TYPE_OPTIONS?.find(r => r.value === fr.floorRoofType)?.label || fr.floorRoofType}</td></tr>
                        <tr><td>Roof Thickness</td><td>{fr.floorRoofThickness || 100} mm</td></tr>
                        <tr><td>Roof Panel Width</td><td>{fr.floorRoofWidth || 1150} mm</td></tr>
                      </>
                    )}
                  </tbody>
                </table>
              </section>
            );
          })}

          {/* Final Summary */}
          <section>
            <h4>Final Summary</h4>
            <table className="quote-table">
              <tbody>
                <tr><td>Total PUF Panels Required</td><td><strong style={{ color: "var(--accent)", fontSize: "16px" }}>{calc.totalPanels} panels</strong></td></tr>
                <tr><td>Total Panel Area</td><td><strong>{calc.totalArea.toFixed(2)} {au}</strong></td></tr>
                <tr><td>Number of Floors</td><td>{floorCount}</td></tr>
              </tbody>
            </table>
          </section>

          {/* Contact */}
          <div className="contact-card">
            <div className="contact-icon">📞</div>
            <div>
              <div className="contact-title">Contact ESSARFAB for Pricing & Orders</div>
              <div className="contact-phone">+91-98387 00617</div>
              <div className="contact-web">WhatsApp: +91-80528 75755 · infoessarfabgreen@gmail.com</div>
              <div className="contact-web">www.essarfabgreenindia.com</div>
            </div>
          </div>

        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={handleCopy}>📋 Copy</button>
          <button className="btn btn-outline" onClick={() => window.print()}>🖨️ Print</button>
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>

      </div>
    </div>
  );
}

export default QuoteModal;
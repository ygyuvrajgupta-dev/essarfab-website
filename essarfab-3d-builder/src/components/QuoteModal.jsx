import { useEffect } from "react";

function QuoteModal({ open, onClose, config, calc, floors, unit, displayUnit, COLOR_OPTIONS, STRUCTURE_TYPES }) {
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
  const displayH = config.displayTotalHeight ?? (config.totalHeight ? (unit === "m" ? config.totalHeight.toFixed(1) : (config.totalHeight * 3.28084).toFixed(1)) : "—");

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
      `Floor Area (each)   : ${(config.length * config.width).toFixed(2)} m²`,
      `Total Floor Area    : ${(config.length * config.width * floorCount).toFixed(2)} m²`,
      `Include Roof        : ${config.showRoof ? "Yes" : "No"}`,
      `Panel Type          : ${config.panelType || "both"}`,
      "",
      "── Per-Floor Breakdown ────────────────────",
      ...(calc.floorResults || []).flatMap((fr, fi) => [
        `  ${fr.label || `Floor ${fi + 1}`}:`,
        `    Wall Panels:    ${fr.floorPanels} panels · ${fr.floorArea.toFixed(2)} ${au}`,
        `    Est. Weight:    ${fr.floorWeight.toFixed(0)} kg`,
        `    Wall Color:     ${COLOR_OPTIONS?.find(c => c.hex === fr.panelColor)?.name || fr.panelColor}`,
        `    Wall Thickness: ${fr.wallThickness} mm`,
        "",
      ]),
      "── Summary ──────────────────────────────",
      `Total Panels       : ${calc.totalPanels}`,
      `Total Panel Area   : ${calc.totalArea.toFixed(2)} ${au}`,
      `Estimated Weight   : ${calc.totalWeight.toFixed(0)} kg`,
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
                <tr><td>Floor Area (per floor)</td><td>{(config.length * config.width).toFixed(2)} m²</td></tr>
                <tr><td>Total Floor Area</td><td>{(config.length * config.width * floorCount).toFixed(2)} m²</td></tr>
                <tr><td>Roof Panels</td><td>{config.showRoof ? "Included" : "Not included"}</td></tr>
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
                    <tr><th>Wall</th><th>Gross {au}</th><th>Net {au}</th><th>Panels</th></tr>
                  </thead>
                  <tbody>
                    {fr.wallRows.map(w => (
                      <tr key={w.id}>
                        <td>{w.label.replace(`${fr.label} - `, "")}</td>
                        <td>{w.grossArea.toFixed(2)}</td>
                        <td>{w.netArea.toFixed(2)}</td>
                        <td><strong>{w.panelCount}</strong></td>
                      </tr>
                    ))}
                    {fr.partitionRows.map((p, pi) => (
                      <tr key={`p-${pi}`}>
                        <td style={{ color: "var(--primary-light)" }}>{p.label}</td>
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
                    <tr><td>Est. Weight (this floor)</td><td>{fr.floorWeight.toFixed(0)} kg</td></tr>
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
                <tr><td>Total Estimated Weight</td><td><strong>{calc.totalWeight.toFixed(0)} kg</strong></td></tr>
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
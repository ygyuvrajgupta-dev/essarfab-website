import { useEffect } from "react";

function QuoteModal({ open, onClose, config, calc, openings, partitions, COLOR_OPTIONS, STRUCTURE_TYPES }) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const colorName  = COLOR_OPTIONS?.find(c => c.hex === config.panelColor)?.name || config.panelColor;
  const structName = STRUCTURE_TYPES?.find(s => s.value === config.structureType)?.label || config.structureType;
  const unit = config.unit || "m";
  const du = unit === "m" ? "m" : "ft";
  const au = unit === "m" ? "m²" : "sq.ft";

  const displayL = config.displayLength ?? config.length;
  const displayW = config.displayWidth ?? config.width;
  const displayH = config.displayHeight ?? config.height;

  const handleCopy = () => {
    const lines = [
      "════════════════════════════════════════",
      "   ESSARFAB GREEN INDIA PVT LTD",
      "   PUF Panel Estimation — Quote Summary",
      "════════════════════════════════════════",
      "",
      `Project Type     : ${structName}`,
      `Dimensions       : ${displayL}${du} (L) × ${displayW}${du} (W) × ${displayH}${du} (H)`,
      `Panel Thickness  : ${config.panelThickness} mm`,
      `Panel Width Std  : ${config.panelWidthMM} mm`,
      `Panel Color      : ${colorName}`,
      `Include Roof     : ${config.showRoof ? "Yes" : "No"}`,
      "",
      "── Outer Walls ──────────────────────────",
      ...calc.wallRows.map(w =>
        `${w.label.padEnd(14)} | Gross: ${w.grossArea.toFixed(2).padStart(6)} ${au} | Deduct: ${w.openingDeduction.toFixed(2).padStart(5)} ${au} | Net: ${w.netArea.toFixed(2).padStart(6)} ${au} | Panels: ${w.panelCount}`
      ),
      "",
      `Roof             | Area:  ${calc.roofArea.toFixed(2)} ${au} | Panels: ${calc.roofPanelCount}`,
      "",
      ...(calc.partitionRows.length > 0 ? [
        "── Partitions ───────────────────────────",
        ...calc.partitionRows.map(p =>
          `${(p.label).padEnd(14)} | Gross: ${p.grossArea.toFixed(2).padStart(6)} ${au} | Net: ${p.netArea.toFixed(2).padStart(6)} ${au} | Panels: ${p.panelCount}`
        ),
        "",
      ] : []),
      "── Summary ──────────────────────────────",
      `Total Panels     : ${calc.totalPanels}`,
      `Total Panel Area : ${calc.totalArea.toFixed(2)} ${au}`,
      `Estimated Weight : ${calc.weight.toFixed(0)} kg`,
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
            <div className="modal-subtitle">PUF Panel Estimation — Quote Summary</div>
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
                <tr><td>Floor Area</td><td>{(config.length * config.width).toFixed(2)} m² {unit === "ft" ? `/ ${(displayL * displayW).toFixed(2)} sq.ft` : ""}</td></tr>
                <tr><td>Panel Thickness</td><td>{config.panelThickness} mm</td></tr>
                <tr><td>Standard Panel Width</td><td>{config.panelWidthMM} mm</td></tr>
                <tr>
                  <td>Panel Color</td>
                  <td>
                    <span className="color-dot" style={{ background: config.panelColor }} />
                    {colorName}
                  </td>
                </tr>
                <tr><td>Roof Panels</td><td>{config.showRoof ? "Included" : "Not included"}</td></tr>
              </tbody>
            </table>
          </section>

          {/* Walls breakdown */}
          <section>
            <h4>Outer Wall Panels</h4>
            <table className="quote-table">
              <thead>
                <tr><th>Wall</th><th>Gross {au}</th><th>Deduct {au}</th><th>Net {au}</th><th>Panels</th></tr>
              </thead>
              <tbody>
                {calc.wallRows.map(w => (
                  <tr key={w.id}>
                    <td>{w.label}</td>
                    <td>{w.grossArea.toFixed(2)}</td>
                    <td>{w.openingDeduction > 0 ? <span className="deduct">-{w.openingDeduction.toFixed(2)}</span> : "—"}</td>
                    <td>{w.netArea.toFixed(2)}</td>
                    <td><strong>{w.panelCount}</strong></td>
                  </tr>
                ))}
                {config.showRoof && (
                  <tr>
                    <td>Roof</td>
                    <td>{calc.roofArea.toFixed(2)}</td>
                    <td>—</td>
                    <td>{calc.roofArea.toFixed(2)}</td>
                    <td><strong>{calc.roofPanelCount}</strong></td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          {/* Partitions */}
          {calc.partitionRows.length > 0 && (
            <section>
              <h4>Internal Partition Panels</h4>
              <table className="quote-table">
                <thead>
                  <tr><th>Partition</th><th>Gross {au}</th><th>Deduct {au}</th><th>Net {au}</th><th>Panels</th></tr>
                </thead>
                <tbody>
                  {calc.partitionRows.map((p, i) => (
                    <tr key={i}>
                      <td>{p.label}</td>
                      <td>{p.grossArea.toFixed(2)}</td>
                      <td>{p.deduct > 0 ? <span className="deduct">-{p.deduct.toFixed(2)}</span> : "—"}</td>
                      <td>{p.netArea.toFixed(2)}</td>
                      <td><strong>{p.panelCount}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* Openings */}
          {openings && openings.length > 0 && (
            <section>
              <h4>Openings Deducted</h4>
              <table className="quote-table">
                <thead><tr><th>Label</th><th>Type</th><th>Location</th><th>W × H</th><th>Area</th></tr></thead>
                <tbody>
                  {openings.map(o => (
                    <tr key={o.id}>
                      <td>{o.label}</td>
                      <td style={{textTransform:"capitalize"}}>{o.type}</td>
                      <td style={{textTransform:"capitalize"}}>{o.wall}</td>
                      <td>{o.width}{du} × {o.height}{du}</td>
                      <td><span className="deduct">-{((parseFloat(o.width)||0)*(parseFloat(o.height)||0)).toFixed(2)} {au}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* Totals */}
          <section>
            <h4>Final Summary</h4>
            <table className="quote-table">
              <tbody>
                <tr><td>Total PUF Panels Required</td><td><strong style={{color:"var(--accent)",fontSize:"16px"}}>{calc.totalPanels} panels</strong></td></tr>
                <tr><td>Total Panel Area</td><td><strong>{calc.totalArea.toFixed(2)} {au}</strong></td></tr>
                <tr><td>Estimated Panel Weight</td><td>{calc.weight.toFixed(0)} kg</td></tr>
                <tr><td>Panel Thickness</td><td>{config.panelThickness} mm</td></tr>
                <tr><td>Standard Panel Width</td><td>{config.panelWidthMM} mm</td></tr>
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
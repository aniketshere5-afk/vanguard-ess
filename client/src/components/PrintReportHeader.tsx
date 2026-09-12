import GovSetuMark from "./brand/GovSetuMark";

/**
 * Letterhead shown only when printing / saving as PDF (hidden on screen).
 * Turns the workbench's live view into a filed report artifact: identity,
 * subject component, who generated it and when.
 */
export default function PrintReportHeader({ componentCode, lotCode, preparedBy }: { componentCode?: string; lotCode?: string; preparedBy?: string }) {
  return (
    <div className="hidden print:block">
      <div className="flex items-center justify-between border-b-2 pb-3" style={{ borderColor: "var(--gov-navy)" }}>
        <div className="flex items-center gap-3">
          <span style={{ color: "var(--gov-navy)" }}><GovSetuMark className="h-10 w-10" /></span>
          <div>
            <p className="text-lg font-bold tracking-tight" style={{ color: "var(--gov-navy)" }}>VANGUARD ESS</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Reliability Investigation Report</p>
          </div>
        </div>
        <div className="text-right text-[10px] text-muted-foreground">
          <p>Generated {new Date().toLocaleString()}</p>
          {preparedBy && <p>Prepared by {preparedBy}</p>}
        </div>
      </div>
      {(componentCode || lotCode) && (
        <p className="mt-2 text-sm font-semibold">
          Component {componentCode ?? "—"} {lotCode ? `· Lot ${lotCode}` : ""}
        </p>
      )}
      <div className="tricolour-rule mt-2" />
    </div>
  );
}

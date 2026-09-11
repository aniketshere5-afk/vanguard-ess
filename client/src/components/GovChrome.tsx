import { useEffect, useRef } from "react";
import GovSetuMark from "./brand/GovSetuMark";
import MissionAssuranceBadge from "./brand/MissionAssuranceBadge";
import ISTClock from "./ISTClock";

/**
 * GovSetu masthead: a persistent "SIH prototype" identification strip, a
 * bilingual institutional-style identity row (original GovSetu mark left,
 * Mission Assurance badge right — neither reproduces any official emblem or
 * logo), and the tricolour rule. Shared by the console and the sign-in screen.
 *
 * Its real height is measured and written to --gov-mast so the fixed-position
 * sidebar (and any sticky sub-header) can sit exactly below it at every
 * viewport width, instead of guessing a fixed pixel offset per breakpoint.
 */
export function GovMasthead() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const applyHeight = () => document.documentElement.style.setProperty("--gov-mast", `${el.offsetHeight}px`);
    applyHeight();
    const observer = new ResizeObserver(applyHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <header ref={ref} className="sticky top-0 z-50">
      <div style={{ background: "var(--gov-navy)" }} className="text-white/90">
        <div className="mx-auto flex h-7 max-w-[1600px] items-center justify-between px-4 text-[11px] tracking-wide">
          <span className="font-semibold tracking-wider">SMART INDIA HACKATHON &nbsp;•&nbsp; PROTOTYPE</span>
          <ISTClock className="text-[11px]" />
        </div>
      </div>
      <div style={{ background: "var(--gov-navy)" }} className="text-white">
        <div className="mx-auto flex min-h-[76px] max-w-[1600px] items-center gap-3 px-4 py-2">
          <div className="flex shrink-0 items-center gap-2.5">
            <GovSetuMark className="h-10 w-10 text-white" />
            <div className="hidden leading-tight sm:block">
              <p className="font-serif text-base font-bold tracking-tight">VANGUARD ESS</p>
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/70">Aerospace Reliability Intelligence</p>
            </div>
          </div>
          <div className="min-w-0 flex-1 text-center">
            <p className="font-serif text-[15px] font-semibold leading-tight sm:text-lg">भारतीय अंतरिक्ष मिशन एवं विश्वसनीयता विश्लेषण</p>
            <p className="text-xs font-medium leading-tight text-white/85 sm:text-sm">Indian Space Mission &amp; Reliability Analytics</p>
            <p className="mt-0.5 hidden text-[10px] text-white/55 sm:block">Hackathon prototype · VanGuard ESS · not affiliated with ISRO or the Government of India</p>
          </div>
          <MissionAssuranceBadge className="h-10 w-10 shrink-0 text-white" />
        </div>
      </div>
      <div className="tricolour-rule" />
    </header>
  );
}

export function GovFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="tricolour-rule opacity-70" />
      <div className="mx-auto flex max-w-[1600px] flex-col gap-1 px-4 py-4 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>Independent hackathon prototype — not an official ISRO or Government of India website.</span>
        <span>Model PRRS-LINEAR-1.0 · Workflow: Upload → Validate → Process → Run Model → Reliability → Results</span>
      </div>
    </footer>
  );
}

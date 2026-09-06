import GovMark from "./GovMark";

/**
 * Government-style masthead: a slim utility strip, a bilingual identity block,
 * and the tricolour rule. Shared by the authenticated console and the
 * sign-in screen so the whole product reads as one institutional system.
 */
export function GovMasthead() {
  return (
    <header className="sticky top-0 z-50">
      <div className="gov-utility flex h-6 items-center">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-4 text-[11px] tracking-wide">
          <span>Government of India · भारत सरकार — Prototype console</span>
          <span className="hidden sm:inline">Synthetic / Demonstration data</span>
        </div>
      </div>
      <div className="gov-masthead flex h-16 items-center">
        <div className="mx-auto flex w-full max-w-[1600px] items-center gap-3 px-4">
          <GovMark className="gov-emblem h-9 w-9 shrink-0" />
          <div className="min-w-0">
            <p className="font-serif text-base font-semibold leading-tight tracking-tight text-foreground">VanGuard ESS</p>
            <p className="truncate text-[12px] leading-tight text-muted-foreground">
              Electronic Systems Screening · Reliability Investigation Platform
              <span className="mx-1.5 hidden text-border sm:inline">|</span>
              <span className="hidden font-serif sm:inline">इलेक्ट्रॉनिक प्रणाली विश्वसनीयता जाँच</span>
            </p>
          </div>
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
        <span>Prototype build · Synthetic / Demonstration data. Not an official Government of India or ISRO system.</span>
        <span>Model PRRS-LINEAR-1.0 · Workflow: Observe → Validate → Compare → Detect → Predict → Explain → Decide → Audit</span>
      </div>
    </footer>
  );
}

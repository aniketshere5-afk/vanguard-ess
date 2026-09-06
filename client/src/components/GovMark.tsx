/**
 * Institutional mark for the console masthead. Deliberately generic — an
 * orbit ring around an ascent chevron — and not a reproduction of the State
 * Emblem or any agency insignia. This is a prototype, not an official system.
 */
export default function GovMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="VanGuard ESS mark" fill="none">
      <circle cx="24" cy="24" r="21" stroke="currentColor" strokeWidth="2" />
      <ellipse cx="24" cy="24" rx="21" ry="8" stroke="currentColor" strokeWidth="1.4" opacity="0.55" />
      <path d="M24 11 L33 33 L24 27 L15 33 Z" fill="currentColor" />
      <circle cx="24" cy="24" r="2.4" fill="currentColor" />
    </svg>
  );
}

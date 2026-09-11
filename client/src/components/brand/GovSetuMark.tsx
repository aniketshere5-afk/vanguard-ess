/**
 * Original GovSetu aerospace mark: an abstract satellite on an orbital ring
 * with a navigation star, bounded by a thin seal-style ring so it reads as
 * one polished mark rather than loose floating shapes. Navy-dominant with
 * saffron/green accents.
 *
 * Deliberately NOT a reproduction of any official emblem or agency logo —
 * see docs/brand-and-disclaimers.md for why.
 */
export default function GovSetuMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="VanGuard ESS mark" fill="none">
      {/* seal boundary, matches the Mission Assurance badge's ring language */}
      <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="1.2" opacity="0.35" />
      {/* orbital ring */}
      <ellipse cx="24" cy="24" rx="17.5" ry="10.5" stroke="currentColor" strokeWidth="1.5" opacity="0.6" transform="rotate(-18 24 24)" />
      {/* navigation star at center */}
      <path d="M24 14.5 L25.9 22.1 L33.5 24 L25.9 25.9 L24 33.5 L22.1 25.9 L14.5 24 L22.1 22.1 Z" fill="currentColor" />
      {/* satellite riding the orbit */}
      <g transform="rotate(-18 24 24) translate(41.5 24)">
        <rect x="-2.4" y="-1.5" width="4.8" height="3" rx="0.6" fill="var(--gov-saffron)" />
        <line x1="-4.8" y1="0" x2="-2.4" y2="0" stroke="var(--gov-saffron)" strokeWidth="1" />
        <line x1="2.4" y1="0" x2="4.8" y2="0" stroke="var(--gov-green)" strokeWidth="1" />
      </g>
    </svg>
  );
}

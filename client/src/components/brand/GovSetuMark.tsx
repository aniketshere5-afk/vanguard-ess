/**
 * Original GovSetu aerospace mark: an abstract satellite on an orbital ring
 * with a navigation star, navy-dominant with saffron/green accents.
 *
 * Deliberately NOT a reproduction of any official emblem or agency logo —
 * see docs/brand-and-disclaimers.md for why.
 */
export default function GovSetuMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="GovSetu mark" fill="none">
      {/* orbital ring */}
      <ellipse cx="24" cy="24" rx="20" ry="12" stroke="currentColor" strokeWidth="1.6" opacity="0.55" transform="rotate(-18 24 24)" />
      {/* navigation star at center */}
      <path d="M24 13 L26.1 21.9 L35 24 L26.1 26.1 L24 35 L21.9 26.1 L13 24 L21.9 21.9 Z" fill="currentColor" />
      {/* satellite riding the orbit */}
      <g transform="rotate(-18 24 24) translate(41.5 24)">
        <rect x="-2.6" y="-1.6" width="5.2" height="3.2" rx="0.6" fill="var(--gov-saffron)" />
        <line x1="-5.2" y1="0" x2="-2.6" y2="0" stroke="var(--gov-saffron)" strokeWidth="1.1" />
        <line x1="2.6" y1="0" x2="5.2" y2="0" stroke="var(--gov-green)" strokeWidth="1.1" />
      </g>
    </svg>
  );
}

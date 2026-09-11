/**
 * Original circular "Mission Assurance" badge — orbital lines, a star/satellite
 * motif, and a tricolour ring. Occupies the position an official emblem would
 * take in a government masthead, but is a distinct GovSetu graphic: no lions,
 * no Lion Capital, no Ashoka Chakra, no State Emblem, no ISRO logo.
 */
export default function MissionAssuranceBadge({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="GovSetu Mission Assurance badge" fill="none">
      <circle cx="24" cy="24" r="21.5" fill="none" stroke="var(--gov-saffron)" strokeWidth="1.6" strokeDasharray="2 2.4" />
      <circle cx="24" cy="24" r="18.5" fill="none" stroke="var(--gov-green)" strokeWidth="1.6" strokeDasharray="2 2.4" strokeDashoffset="2" />
      <circle cx="24" cy="24" r="14.5" fill="var(--card)" stroke="currentColor" strokeWidth="1.3" />
      <ellipse cx="24" cy="24" rx="10.5" ry="5.5" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <path d="M24 16 L25.6 22.4 L32 24 L25.6 25.6 L24 32 L22.4 25.6 L16 24 L22.4 22.4 Z" fill="currentColor" />
    </svg>
  );
}

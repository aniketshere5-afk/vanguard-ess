/**
 * Original circular "Mission Assurance" badge — a seal-style ring with
 * radial tick marks, a tricolour dashed band, and a star/orbit motif at the
 * centre. Occupies the position an official emblem would take in a
 * government masthead, but is a distinct GovSetu graphic: no lions, no Lion
 * Capital, no Ashoka Chakra, no State Emblem, no ISRO logo. Generous padding
 * inside the outer ring keeps the artwork away from the circle's edge at
 * both desktop and the smaller mobile rendering.
 */
export default function MissionAssuranceBadge({ className = "h-10 w-10" }: { className?: string }) {
  const ticks = Array.from({ length: 16 }, (_, i) => (i * 360) / 16);
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="VanGuard ESS Mission Assurance seal" fill="none">
      {/* outer rim */}
      <circle cx="24" cy="24" r="22.5" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      {/* radial tick marks, evenly spaced — a generic "official seal" device */}
      {ticks.map(deg => (
        <line
          key={deg}
          x1={24 + 20.5 * Math.cos((deg * Math.PI) / 180)}
          y1={24 + 20.5 * Math.sin((deg * Math.PI) / 180)}
          x2={24 + 22 * Math.cos((deg * Math.PI) / 180)}
          y2={24 + 22 * Math.sin((deg * Math.PI) / 180)}
          stroke="currentColor"
          strokeWidth="0.8"
          opacity="0.5"
        />
      ))}
      {/* tricolour dashed band */}
      <circle cx="24" cy="24" r="19" fill="none" stroke="var(--gov-saffron)" strokeWidth="1.6" strokeDasharray="2 2.6" />
      <circle cx="24" cy="24" r="16.5" fill="none" stroke="var(--gov-green)" strokeWidth="1.6" strokeDasharray="2 2.6" strokeDashoffset="2" />
      {/* solid seal face, generous padding to the rings above */}
      <circle cx="24" cy="24" r="13.5" fill="var(--card)" stroke="currentColor" strokeWidth="1.2" />
      <ellipse cx="24" cy="24" rx="9.5" ry="5" stroke="currentColor" strokeWidth="0.9" opacity="0.5" />
      {/* eight-point navigation star, matched to the GovSetu mark */}
      <path d="M24 17 L25.5 22.5 L31 24 L25.5 25.5 L24 31 L22.5 25.5 L17 24 L22.5 22.5 Z" fill="currentColor" />
    </svg>
  );
}

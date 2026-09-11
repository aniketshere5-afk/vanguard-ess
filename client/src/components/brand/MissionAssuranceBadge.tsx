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
      <circle cx="24" cy="24" r="22.5" stroke="currentColor" strokeWidth="1.4" opacity="0.7" />
      {/* radial tick marks, evenly spaced — a generic "official seal" device */}
      {ticks.map(deg => (
        <line
          key={deg}
          x1={24 + 20 * Math.cos((deg * Math.PI) / 180)}
          y1={24 + 20 * Math.sin((deg * Math.PI) / 180)}
          x2={24 + 22 * Math.cos((deg * Math.PI) / 180)}
          y2={24 + 22 * Math.sin((deg * Math.PI) / 180)}
          stroke="currentColor"
          strokeWidth="1.1"
          opacity="0.75"
        />
      ))}
      {/* tricolour dashed band */}
      <circle cx="24" cy="24" r="19" fill="none" stroke="var(--gov-saffron)" strokeWidth="2" strokeDasharray="2.4 2.6" />
      <circle cx="24" cy="24" r="16.5" fill="none" stroke="var(--gov-green)" strokeWidth="2" strokeDasharray="2.4 2.6" strokeDashoffset="2" />
      {/* solid seal face, generous padding to the rings above */}
      <circle cx="24" cy="24" r="13.5" fill="var(--card)" stroke="currentColor" strokeWidth="1.6" />
      <ellipse cx="24" cy="24" rx="9.5" ry="5" stroke="currentColor" strokeWidth="1.1" opacity="0.65" />
      {/* eight-point navigation star, matched to the VanGuard mark */}
      <path d="M24 16.5 L25.7 22.3 L31.5 24 L25.7 25.7 L24 31.5 L22.3 25.7 L16.5 24 L22.3 22.3 Z" fill="var(--primary)" />
    </svg>
  );
}

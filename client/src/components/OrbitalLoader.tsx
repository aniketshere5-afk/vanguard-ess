/**
 * "Orbital Mission Processing" loader: a satellite tracing an orbit around a
 * data-node core, with a contextual message underneath. Used for every
 * full-section loading state in place of a generic spinner.
 */
export default function OrbitalLoader({ label = "Processing…", compact = false }: { label?: string; compact?: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${compact ? "py-4" : "py-10"}`}>
      <svg viewBox="0 0 64 64" className={compact ? "h-10 w-10" : "h-14 w-14"} role="img" aria-label="Loading">
        <circle cx="32" cy="32" r="27" fill="none" stroke="var(--border)" strokeWidth="1.5" />
        {/* data nodes around the static outer ring */}
        {[0, 90, 180, 270].map(deg => (
          <circle
            key={deg}
            cx={32 + 27 * Math.cos((deg * Math.PI) / 180)}
            cy={32 + 27 * Math.sin((deg * Math.PI) / 180)}
            r="1.6"
            fill="var(--muted-foreground)"
          />
        ))}
        {/* slow tricolour orbit ring */}
        <g className="origin-center animate-[spin_3.2s_linear_infinite]">
          <ellipse cx="32" cy="32" rx="22" ry="12" fill="none" stroke="var(--gov-saffron)" strokeWidth="1.4" strokeDasharray="4 5" opacity="0.75" />
        </g>
        {/* fast satellite orbit */}
        <g className="origin-center animate-[spin_1.6s_linear_infinite]">
          <ellipse cx="32" cy="32" rx="22" ry="12" fill="none" stroke="transparent" />
          <circle cx="54" cy="32" r="3" fill="var(--primary)" />
        </g>
        <circle cx="32" cy="32" r="5" fill="var(--primary)" />
      </svg>
      <p className="text-xs font-medium tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

import { useEffect, useState } from "react";

const formatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

/** Live Indian Standard Time clock. Uses Asia/Kolkata explicitly rather than trusting the browser's local timezone. */
export default function ISTClock({ className = "" }: { className?: string }) {
  const [time, setTime] = useState(() => formatter.format(new Date()));

  useEffect(() => {
    const id = window.setInterval(() => setTime(formatter.format(new Date())), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span className={`inline-flex items-center gap-1.5 font-mono tabular-nums ${className}`}>
      <span className="text-[9px] font-sans font-semibold uppercase tracking-wider opacity-70">IST</span>
      {time}
    </span>
  );
}

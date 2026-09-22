export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" | "marquee" | "poster" }) {
  if (size === "poster") {
    return (
      <div className="poster-lockup select-none">
        <div className="poster-word">SNAKES</div>
        <div className="poster-and" aria-hidden>
          <Ampersand huge />
        </div>
        <div className="poster-word poster-ladders">
          <span className="relative inline-block">
            <span className="text-gold">L</span>
            ADDERS
            <span className="pointer-events-none absolute -left-2 top-1 h-[78%] w-3.5 opacity-95">
              <LadderMark />
            </span>
          </span>
        </div>
        <div className="poster-slots">Slots</div>
      </div>
    );
  }

  const scale =
    size === "lg"
      ? "text-4xl"
      : size === "marquee"
        ? "text-xl"
        : size === "sm"
          ? "text-lg"
          : "text-2xl";
  const sub = size === "lg" ? "text-sm tracking-[0.35em]" : "text-[10px] tracking-[0.32em]";
  const showSub = size !== "marquee";
  return (
    <div className={`select-none text-center ${size === "marquee" ? "logo-lit" : ""}`}>
      <div className={`font-display font-extrabold leading-none text-cream ${scale}`}>
        SNAKES{" "}
        <span className="relative inline-block text-emerald">
          <Ampersand />
        </span>{" "}
        <span className="relative inline-block">
          <span className="text-gold">L</span>
          ADDERS
          <span className="pointer-events-none absolute -left-1 top-1 h-[70%] w-2.5 opacity-90" aria-hidden>
            <LadderMark />
          </span>
        </span>
      </div>
      {showSub && <div className={`mt-2 font-sans font-bold uppercase text-gold ${sub}`}>Slots</div>}
    </div>
  );
}

function LadderMark() {
  return (
    <svg viewBox="0 0 12 40" className="h-full w-full">
      <rect x="1" y="0" width="2" height="40" rx="1" fill="#FFC14A" />
      <rect x="9" y="0" width="2" height="40" rx="1" fill="#FFC14A" />
      <rect x="1" y="6" width="10" height="1.6" fill="#FFF6EC" />
      <rect x="1" y="16" width="10" height="1.6" fill="#FFF6EC" />
      <rect x="1" y="26" width="10" height="1.6" fill="#FFF6EC" />
      <rect x="1" y="36" width="10" height="1.6" fill="#FFF6EC" />
    </svg>
  );
}

function Ampersand({ huge = false }: { huge?: boolean }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={huge ? "poster-amp" : "inline-block h-[0.9em] w-[0.9em] align-[-0.12em]"}
      aria-hidden
    >
      <path
        d="M8 28c0-10 14-12 18-4 3 6-6 10-2 16 4 6 16 2 18-6"
        fill="none"
        stroke="#2ECC71"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle cx="34" cy="16" r="5.5" fill="#2ECC71" />
      <circle cx="32.5" cy="15" r="1.3" fill="#0B1220" />
      <circle cx="36" cy="15" r="1.3" fill="#0B1220" />
      <circle cx="33.4" cy="17.4" r="0.7" fill="#FFF6EC" />
    </svg>
  );
}

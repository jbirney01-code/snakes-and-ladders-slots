import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  BookOpen,
  Gift,
  Home,
  ListChecks,
  Settings,
  Trophy,
  UserRound,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { BET_STEPS, LEGAL, TAGLINE, todayKey, xpToNext } from "@/game/constants";
import { unlockAudio } from "@/game/audio";
import { publicUrl } from "@/game/publicUrl";
import { useGame } from "@/game/store";
import { formatLc } from "@/lib/utils";
import { Logo } from "./Logo";
import { ReelsCanvas } from "./ReelsCanvas";

export function WalletPills() {
  const lc = useGame((s) => s.lc);
  const dt = useGame((s) => s.dt);
  const setOverlay = useGame((s) => s.setOverlay);
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setOverlay("getcoins")}
        className="flex h-11 items-center gap-2 rounded-md bg-navy-2 px-3 ring-1 ring-cream/10"
      >
        <span className="tabular text-sm font-semibold text-cream">{formatLc(lc)}</span>
      </button>
      <div className="flex h-11 items-center gap-2 rounded-md bg-navy-2 px-3 ring-1 ring-cream/10">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald">DT</span>
        <span className="tabular text-sm font-semibold text-cream">{dt}</span>
      </div>
    </div>
  );
}

export function Splash() {
  const finish = useGame((s) => s.finishSplash);
  useEffect(() => {
    const t = window.setTimeout(finish, 2800);
    return () => window.clearTimeout(t);
  }, [finish]);
  return (
    <button
      type="button"
      className="poster-screen w-full text-left"
      onClick={() => {
        unlockAudio();
        finish();
      }}
    >
      <img src={publicUrl("/art/hero-splash.jpg")} alt="" className="poster-art" />
      <div className="poster-shade" />
      <div className="poster-hero">
        <Logo size="poster" />
        <p className="poster-tag">{TAGLINE}</p>
      </div>
      <div className="poster-plate items-center text-center">
        <div className="mb-3 flex justify-center gap-3">
          <img
            src={publicUrl("/sprites/dice.png")}
            alt=""
            className="h-14 w-14"
            style={{ animation: "diceSlam 700ms cubic-bezier(0.22,1,0.36,1) both" }}
          />
          <img
            src={publicUrl("/sprites/dice.png")}
            alt=""
            className="h-14 w-14"
            style={{ animation: "diceSlam 700ms 120ms cubic-bezier(0.22,1,0.36,1) both" }}
          />
        </div>
        <p className="font-display text-lg font-bold text-gold">Tap to enter the parlor</p>
        <p className="mt-2 text-[10px] leading-relaxed text-muted/80">{LEGAL}</p>
      </div>
    </button>
  );
}

export function Lobby() {
  const enter = useGame((s) => s.enterTable);
  const setOverlay = useGame((s) => s.setOverlay);
  const level = useGame((s) => s.level);
  const xp = useGame((s) => s.xp);
  const missions = useGame((s) => s.missions);
  const daily = useGame((s) => s.daily);
  const need = xpToNext(level);
  const missionReady = missions.some((m) => !m.claimed && m.progress >= m.target);
  const dailyReady = daily.lastWheelDay !== todayKey();

  return (
    <div className="safe-pad mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col gap-3 px-3 py-3">
      <header className="flex items-center justify-between gap-3">
        <Logo size="sm" />
        <div className="flex items-center gap-2">
          <WalletPills />
          <IconBtn label="Settings" onClick={() => setOverlay("settings")}>
            <Settings className="size-5" />
          </IconBtn>
        </div>
      </header>

      <div>
        <div className="mb-1 flex items-center justify-between text-xs text-muted">
          <span>Level {level}</span>
          <span className="tabular">
            {xp}/{need} XP
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-navy-3">
          <div
            className="h-full rounded-full bg-mint"
            style={{ width: `${Math.min(100, (xp / need) * 100)}%` }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={enter}
        className="lobby-hero relative min-h-0 flex-1 overflow-hidden rounded-xl text-left brass-ring"
      >
        <img src={publicUrl("/art/mural-lobby.jpg")} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="lobby-hero-shade" />
        <div className="relative z-10 flex h-full min-h-[14rem] flex-col justify-end p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold">Featured machine</p>
          <h2 className="mt-1 font-display text-4xl font-extrabold leading-[0.9] text-cream">
            Snakes <span className="text-emerald">&</span> Ladders
          </h2>
          <p className="poster-tag mt-2 text-left">{TAGLINE}</p>
          <p className="mt-1 text-sm text-cream/80">5×3 · 20 lines · Board bonus</p>
          <span className="gold-btn mx-auto mt-4 flex h-12 w-44 items-center justify-center rounded-md text-center">
            Take a Seat
          </span>
        </div>
      </button>

      <div className="grid grid-cols-2 gap-3">
        <LobbyCard
          icon={<Gift className="size-5 text-gold" />}
          title="Daily chest"
          badge={dailyReady ? "Ready" : "Done"}
          onClick={() => setOverlay("daily")}
        />
        <LobbyCard
          icon={<ListChecks className="size-5 text-emerald" />}
          title="Missions"
          badge={missionReady ? "Claim" : "3"}
          onClick={() => setOverlay("missions")}
        />
        <LobbyCard
          icon={<Trophy className="size-5 text-gold" />}
          title="Leaderboard"
          onClick={() => setOverlay("leaderboard")}
        />
        <LobbyCard
          icon={<UserRound className="size-5 text-mint" />}
          title="Profile"
          onClick={() => setOverlay("profile")}
        />
      </div>
    </div>
  );
}

function LobbyCard({
  icon,
  title,
  badge,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="panel relative flex h-[4.75rem] flex-col items-start justify-center rounded-lg px-4">
      {icon}
      <span className="mt-2 text-sm font-semibold">{title}</span>
      {badge && (
        <span className="absolute right-3 top-3 rounded-full bg-rose px-2 py-0.5 text-[10px] font-bold text-cream">
          {badge}
        </span>
      )}
    </button>
  );
}

function IconBtn({
  children,
  onClick,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="ghost-btn flex size-11 items-center justify-center rounded-md"
    >
      {children}
    </button>
  );
}

export function SlotTable() {
  const setOverlay = useGame((s) => s.setOverlay);
  const enterLobby = useGame((s) => s.enterLobby);
  const spin = useGame((s) => s.spin);
  const spinning = useGame((s) => s.spinning);
  const betIndex = useGame((s) => s.betIndex);
  const bumpBet = useGame((s) => s.bumpBet);
  const maxBet = useGame((s) => s.maxBet);
  const winMeter = useGame((s) => s.winMeter);
  const caption = useGame((s) => s.caption);
  const free = useGame((s) => s.free);
  const auto = useGame((s) => s.auto);
  const startAuto = useGame((s) => s.startAuto);
  const stopAuto = useGame((s) => s.stopAuto);
  const turbo = useGame((s) => s.turbo);
  const setTurbo = useGame((s) => s.setTurbo);
  const sfx = useGame((s) => s.settings.sfx);
  const setSetting = useGame((s) => s.setSetting);
  const lc = useGame((s) => s.lc);
  const dt = useGame((s) => s.dt);
  const hold = useGame((s) => s.hold);
  const last = useGame((s) => s.lastResult);
  const reduced = useGame((s) => s.settings.reducedMotion);
  const captionsOn = useGame((s) => s.settings.captions);
  const setHoldingTurbo = useGame((s) => s.setHoldingTurbo);
  const [autoOpen, setAutoOpen] = useState(false);
  const [shownWin, setShownWin] = useState(0);
  const skipWinRef = useRef(false);

  const bet = BET_STEPS[betIndex]!;
  const busy = spinning || !!free || !!hold;

  useEffect(() => {
    skipWinRef.current = false;
    if (winMeter <= 0) {
      setShownWin(0);
      return;
    }
    const t0 = performance.now();
    const dur = Math.min(1400, 380 + Math.log10(winMeter + 1) * 280);
    let raf = 0;
    const tick = (now: number) => {
      if (skipWinRef.current) {
        setShownWin(winMeter);
        return;
      }
      const t = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setShownWin(Math.round(winMeter * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [winMeter, last]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        if (!spinning) spin();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [spin, spinning]);

  const knobLabel = auto ? "Auto" : spinning ? "—" : free ? "Free" : "Spin";

  return (
    <div className="machine-face">
      <div className="marquee-glass">
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Lobby" className="marquee-btn" onClick={enterLobby}>
            <Home className="size-5" />
          </button>
          <button type="button" aria-label="Paytable" className="marquee-btn" onClick={() => setOverlay("paytable")}>
            <BookOpen className="size-5" />
          </button>
        </div>
        <Logo size="marquee" />
        <div className="flex items-center gap-1">
          <div className="marquee-chip" aria-label={`Dice tokens ${dt}`}>
            <span className="text-[10px] tracking-wide text-emerald">DT</span>
            <span className="tabular">{dt}</span>
          </div>
          <button
            type="button"
            aria-label={sfx ? "Mute sound effects" : "Unmute sound effects"}
            className="marquee-btn"
            onClick={() => setSetting("sfx", !sfx)}
          >
            {sfx ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
          </button>
          <button type="button" aria-label="Settings" className="marquee-btn" onClick={() => setOverlay("settings")}>
            <Settings className="size-5" />
          </button>
        </div>
      </div>

      <div className="led-row">
        <button type="button" className="led-window text-left" onClick={() => setOverlay("getcoins")}>
          <div className="led-label">Credits</div>
          <div className="led-value">{formatLc(lc)}</div>
        </button>
        <div
          className="led-window is-win"
          role="button"
          tabIndex={0}
          onClick={() => {
            skipWinRef.current = true;
            setShownWin(winMeter);
          }}
        >
          <div className="led-label">Win</div>
          <div className="led-value">{formatLc(shownWin)}</div>
        </div>
        <div className="led-window">
          <div className="led-label">Bet</div>
          <div className="led-value">{formatLc(bet)}</div>
        </div>
      </div>

      <div className="reel-window">
        <ReelsCanvas />
        <div className="glass-shine" />
        {free && (
          <div className="reel-banner">
            Free {free.remaining} · ×{free.multiplier}
          </div>
        )}
        {hold && !free && <div className="reel-banner">Hold the ladder</div>}
        {last?.nudged && spinning === false && !free && !hold && <div className="reel-banner">Lucky nudge</div>}
      </div>

      <div className="ticker">
        {captionsOn && caption
          ? caption
          : free
            ? `Free ${free.remaining}  ·  ×${free.multiplier}`
            : "20 lines  ·  board bonus"}
      </div>

      <div className="belly-glass">
        {reduced ? (
          <img src={publicUrl("/cabinet/belly-glass.jpg")} alt="" />
        ) : (
          <video
            className="belly-cobra"
            src={publicUrl("/cabinet/belly-cobra.mp4?v=loop")}
            poster={publicUrl("/cabinet/belly-glass.jpg")}
            autoPlay
            loop
            muted
            playsInline
          />
        )}
        <div className="belly-vignette" />
        <div className="glass-shine" />
        <div className="belly-plate">
          <span>20 lines</span>
          <span>Climb · Slide · Celebrate</span>
        </div>
      </div>

      <div className="button-deck">
        <div className="bet-cluster">
          <button type="button" aria-label="Decrease bet" className="deck-btn" onClick={() => bumpBet(-1)} disabled={busy}>
            −
          </button>
          <div className="bet-readout">
            <span className="k">Bet</span>
            <span className="v">{formatLc(bet)}</span>
          </div>
          <button type="button" aria-label="Increase bet" className="deck-btn" onClick={() => bumpBet(1)} disabled={busy}>
            +
          </button>
        </div>

        <button
          type="button"
          className={`spin-knob ${spinning ? "is-busy" : "is-live"}`}
          aria-label={auto ? `Auto ${auto.remaining}` : "Spin"}
          onPointerDown={() => {
            setHoldingTurbo(true);
            if (!spinning && !auto) spin();
          }}
          onPointerUp={() => setHoldingTurbo(false)}
          onPointerLeave={() => setHoldingTurbo(false)}
        >
          {knobLabel}
          {auto ? <span className="spin-count">{auto.remaining}</span> : null}
        </button>

        <div className="util-cluster">
          <button type="button" className="deck-chip" onClick={maxBet} disabled={busy}>
            Max
          </button>
          <button
            type="button"
            className={`deck-chip ${turbo ? "is-on" : ""}`}
            aria-label="Turbo"
            onClick={() => setTurbo(!turbo)}
          >
            <Zap className="size-4" />
          </button>
          <button type="button" className="deck-chip" onClick={() => (auto ? stopAuto() : setAutoOpen((v) => !v))}>
            {auto ? "Stop" : "Auto"}
          </button>
          {autoOpen && !auto && (
            <div className="panel auto-menu">
              {[10, 25, 50, 100].map((n) => (
                <button
                  key={n}
                  type="button"
                  className="h-11 w-full px-4 text-left text-sm hover:bg-navy-3"
                  onClick={() => {
                    setAutoOpen(false);
                    startAuto(n);
                  }}
                >
                  {n} spins
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

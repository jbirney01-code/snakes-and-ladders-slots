import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { CONSOLATION_MS, LEGAL, PAYS, SKIN_LABEL, SKIN_UNLOCK, SYMBOL_LABEL, SYMBOL_SPRITE, TILE_LETTER, todayKey, xpToNext } from "@/game/constants";
import { PAYLINES } from "@/game/paytable";
import { LADDERS, SNAKES } from "@/game/bonusBoard";
import { shareOrDownload } from "@/game/shareCard";
import { publicUrl } from "@/game/publicUrl";
import { useGame } from "@/game/store";
import { formatLc } from "@/lib/utils";
import type { SkinId, SymbolId } from "@/game/types";

function Modal({
  title,
  children,
  onClose,
  wide,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-navy/70 p-3 sm:items-center">
      <div className={`panel overlay-enter max-h-[88dvh] w-full overflow-y-auto rounded-xl p-5 ${wide ? "max-w-3xl" : "max-w-lg"}`}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="font-display text-2xl font-bold text-gold">{title}</h2>
          <button type="button" aria-label="Close" className="ghost-btn flex size-11 items-center justify-center rounded-md" onClick={onClose}>
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Overlays() {
  const overlay = useGame((s) => s.overlay);
  const setOverlay = useGame((s) => s.setOverlay);
  const bigWin = useGame((s) => s.bigWin);
  const levelUp = useGame((s) => s.levelUp);
  const dismissBig = useGame((s) => s.dismissBigWin);
  const dismissLevel = useGame((s) => s.dismissLevelUp);
  const debug = useGame((s) => s.debug);

  return (
    <>
      {overlay === "paytable" && <Paytable onClose={() => setOverlay(null)} />}
      {overlay === "settings" && <SettingsPanel onClose={() => setOverlay(null)} />}
      {overlay === "profile" && <Profile onClose={() => setOverlay(null)} />}
      {overlay === "daily" && <Daily onClose={() => setOverlay(null)} />}
      {overlay === "missions" && <Missions onClose={() => setOverlay(null)} />}
      {overlay === "leaderboard" && <Leaderboard onClose={() => setOverlay(null)} />}
      {overlay === "getcoins" && <GetCoins onClose={() => setOverlay(null)} />}
      {overlay === "outofcoins" && <OutOfCoins onClose={() => setOverlay(null)} />}
      {overlay === "tutorial" && <Tutorial />}
      {overlay === "share" && !bigWin && !levelUp && <SharePanel onClose={() => setOverlay(null)} />}
      {overlay === "skins" && <Skins onClose={() => setOverlay(null)} />}
      {bigWin && <BigWin amount={bigWin.amount} kind={bigWin.kind} onClose={dismissBig} />}
      {levelUp && !bigWin && <LevelUpCard info={levelUp} onClose={dismissLevel} />}
      {debug && <DebugDock />}
    </>
  );
}

function Paytable({ onClose }: { onClose: () => void }) {
  const [page, setPage] = useState(0);
  const titles = ["Symbols", "20 Paylines", "How the Board Works"];
  const highs: SymbolId[] = ["wild", "ladder", "cobra", "banana", "basket"];
  const lows: SymbolId[] = ["ace", "king", "queen", "jack", "ten"];
  return (
    <Modal title="Paytable" onClose={onClose} wide>
      <div className="mb-4 flex gap-2">
        {titles.map((t, i) => (
          <button
            key={t}
            type="button"
            onClick={() => setPage(i)}
            className={`h-11 rounded-md px-3 text-sm ${page === i ? "gold-btn" : "ghost-btn"}`}
          >
            {t}
          </button>
        ))}
      </div>
      {page === 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {[...highs, ...lows].map((id) => (
            <div key={id} className="flex items-center gap-3 rounded-md bg-navy-3 p-3">
              <SymbolThumb id={id} />
              <div>
                <div className="text-sm font-semibold">{SYMBOL_LABEL[id]}</div>
                <div className="text-xs text-muted">
                  {([5, 4, 3, 2] as const)
                    .filter((n) => PAYS[id][n])
                    .map((n) => `${n}=${PAYS[id][n]}x`)
                    .join(" · ")}
                </div>
              </div>
            </div>
          ))}
          <div className="rounded-md bg-navy-3 p-3 sm:col-span-2">
            <div className="mb-2 flex gap-3">
              <SymbolThumb id="dice" />
              <SymbolThumb id="miniLadder" />
            </div>
            <p className="text-sm">
              <strong className="text-gold">Scatter Dice</strong> — 3 / 4 / 5 anywhere award 10 / 12 / 16 board rolls.
            </p>
            <p className="mt-2 text-sm">
              <strong className="text-gold">Mini Ladder</strong> — 3 / 4 / 5 award 8 / 12 / 15 free spins. Extra scatters
              add a ladder wild. Retrigger +5 (cap 25).
            </p>
            <p className="mt-2 text-sm text-muted">Wild substitutes all except Dice and Mini Ladder. Left-to-right only.</p>
          </div>
        </div>
      )}
      {page === 1 && (
        <div>
          <p className="mb-3 text-sm text-muted">20 fixed lines, left to right. Line bet = total bet ÷ 20.</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PAYLINES.map((line, i) => (
              <LineMap key={i} line={line} index={i} />
            ))}
          </div>
        </div>
      )}
      {page === 2 && (
        <div className="space-y-3 text-sm leading-relaxed text-cream/90">
          <p>Land 3+ Scatter Dice to visit the 100-square heirloom board.</p>
          <p>
            Auto-roll two dice. Hop square by square. <span className="text-gold">8 ladders</span> climb you up;{" "}
            <span className="text-emerald">8 snakes</span> slide you down — sliding still pays the landing square.
          </p>
          <p>
            Prize squares dump $ bags, extra rolls, Mini/Major jackpots, and multipliers into a running pot.
            Multipliers apply to the <em>final</em> pot.
          </p>
          <p>
            Reach or pass 100 to end immediately with a Finish Bonus (200×–500× bet, scaled by unused rolls). If rolls
            run out first, you keep the pot. Advertised max: 5,000× bet.
          </p>
          <p>
            {LADDERS.length} ladders, {SNAKES.length} snakes. Spend 1 Dice Token at the intro for +2 rolls.
          </p>
        </div>
      )}
    </Modal>
  );
}

function SymbolThumb({ id }: { id: SymbolId }) {
  const letter = TILE_LETTER[id];
  return (
    <div
      className="relative size-14 shrink-0 overflow-hidden rounded-md"
      style={{ background: "linear-gradient(180deg, #fff6ec, #e4c98a)" }}
    >
      {!letter && <img src={SYMBOL_SPRITE[id]} alt="" className="h-full w-full object-contain" />}
      {letter && (
        <span
          className="absolute inset-0 flex items-center justify-center font-display text-xl font-extrabold"
          style={{ color: "#3A2040" }}
        >
          {letter}
        </span>
      )}
    </div>
  );
}

function LineMap({ line, index }: { line: number[]; index: number }) {
  return (
    <div className="rounded-md bg-navy-3 p-2">
      <div className="mb-1 text-[10px] text-muted">Line {index + 1}</div>
      <div className="grid grid-cols-5 gap-0.5">
        {[0, 1, 2].map((row) =>
          line.map((r, col) => (
            <div
              key={`${row}-${col}`}
              className={`h-2 rounded-sm ${r === row ? "bg-gold" : "bg-cream/15"}`}
            />
          )),
        )}
      </div>
    </div>
  );
}

function SettingsPanel({ onClose }: { onClose: () => void }) {
  const settings = useGame((s) => s.settings);
  const setSetting = useGame((s) => s.setSetting);
  const replay = useGame((s) => s.replayTutorial);
  const rows: { key: keyof typeof settings; label: string }[] = [
    { key: "sfx", label: "Sound effects" },
    { key: "haptics", label: "Haptics" },
    { key: "reducedMotion", label: "Reduced motion" },
    { key: "turboDefault", label: "Turbo by default" },
    { key: "captions", label: "Feature captions" },
  ];
  return (
    <Modal title="Settings" onClose={onClose}>
      <div className="space-y-2">
        {rows.map((r) => (
          <label key={r.key} className="flex h-12 items-center justify-between rounded-md bg-navy-3 px-3">
            <span>{r.label}</span>
            <input
              type="checkbox"
              className="size-5 accent-gold"
              checked={settings[r.key]}
              onChange={(e) => setSetting(r.key, e.target.checked)}
            />
          </label>
        ))}
      </div>
      <button type="button" className="ghost-btn mt-4 h-12 w-full rounded-md" onClick={replay}>
        Replay tutorial
      </button>
      <p className="mt-5 text-[11px] leading-relaxed text-muted">{LEGAL}</p>
    </Modal>
  );
}

function Profile({ onClose }: { onClose: () => void }) {
  const s = useGame();
  const need = xpToNext(s.level);
  return (
    <Modal title="Profile" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Stat label="Level" value={String(s.level)} />
        <Stat label="XP" value={`${s.xp}/${need}`} />
        <Stat label="Best climb" value={`Sq ${s.bestClimb}`} />
        <Stat label="Biggest pot" value={formatLc(s.biggestPot)} />
        <Stat label="Biggest win" value={formatLc(s.biggestWin)} />
        <Stat label="Spins" value={s.spins.toLocaleString("en-US")} />
      </div>
      <button type="button" className="gold-btn mt-5 h-12 w-full rounded-md" onClick={() => s.setOverlay("skins")}>
        Board token skins
      </button>
    </Modal>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-navy-3 p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
      <div className="tabular mt-1 font-display text-lg font-bold">{value}</div>
    </div>
  );
}

function Skins({ onClose }: { onClose: () => void }) {
  const unlocked = useGame((s) => s.unlockedSkins);
  const skin = useGame((s) => s.skin);
  const setSkin = useGame((s) => s.setSkin);
  const level = useGame((s) => s.level);
  const ids: SkinId[] = ["wood", "crown", "frog", "candy", "neon"];
  return (
    <Modal title="Meeple skins" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        {ids.map((id) => {
          const open = unlocked.includes(id) || level >= SKIN_UNLOCK[id];
          return (
            <button
              key={id}
              type="button"
              disabled={!open}
              onClick={() => setSkin(id)}
              className={`rounded-lg bg-navy-3 p-3 ${skin === id ? "ring-2 ring-gold" : ""}`}
            >
              <img src={publicUrl(`/sprites/meeple-${id}.png`)} alt="" className="mx-auto h-20 w-20 object-contain" />
              <div className="mt-2 text-sm font-semibold">{SKIN_LABEL[id]}</div>
              <div className="text-[11px] text-muted">{open ? "Unlocked" : `Level ${SKIN_UNLOCK[id]}`}</div>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

function Daily({ onClose }: { onClose: () => void }) {
  const daily = useGame((s) => s.daily);
  const spin = useGame((s) => s.spinDailyWheel);
  const reward = useGame((s) => s.dailyReward);
  const day = todayKey();
  const ready = daily.lastWheelDay !== day;
  const [rot, setRot] = useState(0);
  const [whirling, setWhirling] = useState(false);

  function onSpin() {
    if (!ready || whirling) return;
    setWhirling(true);
    const extra = 1440 + Math.floor(Math.random() * 360);
    setRot((r) => r + extra);
    window.setTimeout(() => {
      spin();
      setWhirling(false);
    }, 1400);
  }

  return (
    <Modal title="Daily login wheel" onClose={onClose}>
      <p className="text-sm text-muted">Streak {daily.streak}/7 — day 7 is a Mini Board or a fat $ sack.</p>
      <div className="relative mx-auto mt-5 size-52">
        <div
          className="daily-wheel size-52 rounded-full"
          style={{
            transform: `rotate(${rot}deg)`,
            transition: whirling ? "transform 1.35s cubic-bezier(0.12, 0.7, 0.2, 1)" : "none",
          }}
        />
        <div className="daily-pointer" />
        <button
          type="button"
          disabled={!ready || whirling}
          onClick={onSpin}
          className="absolute inset-[34%] grid place-items-center rounded-full bg-navy text-sm font-bold text-gold ring-2 ring-gold"
        >
          {ready ? (whirling ? "…" : "Spin") : "Done"}
        </button>
      </div>
      {reward && <p className="mt-4 text-center font-display text-xl text-mint">{reward.label}</p>}
      <p className="mt-3 text-center text-xs text-muted">{ready ? "Tap the hub to spin" : "Come back tomorrow"}</p>
    </Modal>
  );
}

function Missions({ onClose }: { onClose: () => void }) {
  const missions = useGame((s) => s.missions);
  const claim = useGame((s) => s.claimMission);
  const allDone = missions.every((m) => m.claimed);
  return (
    <Modal title="Daily missions" onClose={onClose}>
      <div className="space-y-3">
        {missions.map((m) => {
          const ready = !m.claimed && m.progress >= m.target;
          return (
            <div key={m.id} className="rounded-md bg-navy-3 p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-semibold">{m.title}</div>
                  <div className="text-xs text-muted">
                    {m.progress}/{m.target} · {formatLc(m.rewardLc)} · {m.rewardXp} XP
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!ready}
                  className={`h-11 rounded-md px-3 text-sm ${ready ? "gold-btn" : "ghost-btn"}`}
                  onClick={() => claim(m.id)}
                >
                  {m.claimed ? "Claimed" : ready ? "Claim" : "In progress"}
                </button>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-navy">
                <div className="h-full bg-mint" style={{ width: `${(m.progress / m.target) * 100}%` }} />
              </div>
            </div>
          );
        })}
        {allDone && <p className="text-center text-sm text-muted">All done — new missions tomorrow.</p>}
      </div>
    </Modal>
  );
}

function Leaderboard({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"today" | "week" | "all">("today");
  const today = useGame((s) => s.leaderToday);
  const week = useGame((s) => s.leaderWeek);
  const all = useGame((s) => s.leaderAll);
  const list = [...(tab === "today" ? today : tab === "week" ? week : all)].sort((a, b) => b.pot - a.pot);
  return (
    <Modal title="Biggest board pot" onClose={onClose}>
      <div className="mb-3 flex gap-2">
        {(["today", "week", "all"] as const).map((t) => (
          <button key={t} type="button" className={`h-11 rounded-md px-3 text-sm ${tab === t ? "gold-btn" : "ghost-btn"}`} onClick={() => setTab(t)}>
            {t === "all" ? "All-time" : t[0]!.toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="rounded-md bg-navy-3 p-4 text-sm text-muted">No climbs yet — trigger the board bonus to post a pot.</p>
      ) : (
        <ol className="space-y-2">
          {list.map((row, i) => (
            <li key={row.name + i} className={`flex items-center justify-between rounded-md px-3 py-2 ${row.you ? "bg-gold/20" : "bg-navy-3"}`}>
              <span className="text-sm">
                {i + 1}. {row.name}
                {row.you ? " (you)" : ""}
              </span>
              <span className="tabular text-sm text-mint">{formatLc(row.pot)}</span>
            </li>
          ))}
        </ol>
      )}
    </Modal>
  );
}

function GetCoins({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Get more coins" onClose={onClose}>
      <p className="mb-4 text-sm text-muted">No cash shop — earn Ladder Coins by playing.</p>
      <div className="space-y-2">
        <Row disabled={false} label="Daily bonus" hint="Login wheel" />
        <Row disabled={false} label="Missions" hint="Three each day" />
        <Row disabled label="Watch ad" hint="Coming soon" />
        <Row disabled label="Invite a friend" hint="Coming soon" />
      </div>
    </Modal>
  );
}

function Row({ label, hint, disabled }: { label: string; hint: string; disabled?: boolean }) {
  const setOverlay = useGame((s) => s.setOverlay);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (label === "Daily bonus") setOverlay("daily");
        if (label === "Missions") setOverlay("missions");
      }}
      className="flex h-14 w-full items-center justify-between rounded-md bg-navy-3 px-3 text-left disabled:opacity-50"
    >
      <span>{label}</span>
      <span className="text-xs text-muted">{hint}</span>
    </button>
  );
}

function OutOfCoins({ onClose }: { onClose: () => void }) {
  const last = useGame((s) => s.lastConsolation);
  const claim = useGame((s) => s.claimConsolation);
  const setOverlay = useGame((s) => s.setOverlay);
  const remaining = Math.max(0, CONSOLATION_MS - (Date.now() - last));
  const ready = remaining === 0 || last === 0;
  const hrs = Math.ceil(remaining / 3_600_000);
  return (
    <Modal title="Out of coins" onClose={onClose}>
      <p className="text-sm text-muted">The parlor never hard-locks you. Grab the social safety net or wait on Daily.</p>
      <button
        type="button"
        className="gold-btn mt-4 h-12 w-full rounded-md"
        disabled={!ready}
        onClick={() => claim()}
      >
        {ready ? "Collect $5,000 consolation" : `Consolation in ~${hrs}h`}
      </button>
      <button type="button" className="ghost-btn mt-2 h-12 w-full rounded-md" onClick={() => setOverlay("getcoins")}>
        Get more coins
      </button>
      <button type="button" className="ghost-btn mt-2 h-12 w-full rounded-md" onClick={() => setOverlay("daily")}>
        Daily bonus
      </button>
    </Modal>
  );
}

function Tutorial() {
  const [step, setStep] = useState(0);
  const dismiss = useGame((s) => s.dismissTutorial);
  const steps = [
    { title: "Pick a bet", body: "Use + / − to set your bet per spin. You can always drop to $100." },
    { title: "Spin", body: "Hit Spin, tap the reels, or press Space. Hold Spin for turbo." },
    { title: "Wilds", body: "The Golden Gorilla Token substitutes every paying symbol except Dice and Mini Ladders." },
    { title: "The board", body: "Three red dice anywhere open the Snakes & Ladders board — the bonus feature." },
  ];
  const s = steps[step]!;
  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center bg-navy/60 p-4 sm:items-center">
      <div className="panel overlay-enter w-full max-w-md rounded-xl p-5">
        <p className="text-xs uppercase tracking-wide text-gold">
          {step + 1} / {steps.length}
        </p>
        <h2 className="mt-1 font-display text-2xl font-bold">{s.title}</h2>
        <p className="mt-2 text-sm text-muted">{s.body}</p>
        <div className="mt-5 flex gap-2">
          <button type="button" className="ghost-btn h-12 flex-1 rounded-md" onClick={dismiss}>
            Skip
          </button>
          <button
            type="button"
            className="gold-btn h-12 flex-1 rounded-md"
            onClick={() => (step < 3 ? setStep(step + 1) : dismiss())}
          >
            {step < 3 ? "Next" : "Let’s play"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SharePanel({ onClose }: { onClose: () => void }) {
  const payload = useGame((s) => s.sharePayload);
  if (!payload) return null;
  return (
    <Modal title="Share this climb" onClose={onClose}>
      <p className="font-display text-xl">{payload.title}</p>
      <p className="mt-1 text-mint">+{formatLc(payload.amount)}</p>
      <button
        type="button"
        className="gold-btn mt-5 h-12 w-full rounded-md"
        onClick={() => shareOrDownload(payload)}
      >
        Download / share card
      </button>
    </Modal>
  );
}

function BigWin({ amount, kind, onClose }: { amount: number; kind: "big" | "mega"; onClose: () => void }) {
  const [shown, setShown] = useState(0);
  const skipRef = useRef(false);
  useEffect(() => {
    skipRef.current = false;
    const t0 = performance.now();
    const dur = 900;
    let raf = 0;
    const tick = (now: number) => {
      if (skipRef.current) {
        setShown(amount);
        return;
      }
      const t = Math.min(1, (now - t0) / dur);
      setShown(Math.round(amount * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [amount]);
  return (
    <button
      type="button"
      onClick={() => {
        if (shown < amount) {
          skipRef.current = true;
          setShown(amount);
        } else onClose();
      }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-navy/75"
    >
      <div className="overlay-enter text-center">
        <div className="font-display text-sm uppercase tracking-[0.3em] text-gold">{kind === "mega" ? "Mega win" : "Big win"}</div>
        <div className="tabular mt-2 font-display text-5xl font-extrabold text-mint">{formatLc(shown)}</div>
        <div className="mt-3 text-sm text-muted">{shown < amount ? "Tap to skip" : "Tap to continue"}</div>
      </div>
    </button>
  );
}

function LevelUpCard({
  info,
  onClose,
}: {
  info: { level: number; lc: number; dt: number; skin?: SkinId };
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-navy/70 p-4">
      <div className="panel overlay-enter w-full max-w-sm rounded-xl p-6 text-center">
        <div className="font-display text-3xl font-bold text-gold">Level {info.level}</div>
        <p className="mt-2 text-sm text-muted">
          +{formatLc(info.lc)}{info.dt ? ` · +${info.dt} DT` : ""}
          {info.skin ? ` · Unlocked ${SKIN_LABEL[info.skin]}` : ""}
        </p>
        <button type="button" className="gold-btn mt-5 h-12 w-full rounded-md" onClick={onClose}>
          Celebrate
        </button>
      </div>
    </div>
  );
}

function DebugDock() {
  const add = useGame((s) => s.addDebugLc);
  const force = useGame((s) => s.debugForce);
  const skip = useGame((s) => s.debugSkipSquare);
  const [n, setN] = useState(50);
  return (
    <div className="pointer-events-auto absolute bottom-2 left-2 z-50 rounded-md bg-ink/90 p-2 text-[11px] text-cream">
      <div className="mb-1 font-bold text-rose">DEBUG</div>
      <div className="flex flex-wrap gap-1">
        <button type="button" className="gold-btn h-8 rounded px-2" onClick={() => add(50000)}>
          +$50k
        </button>
        <button type="button" className="gold-btn h-8 rounded px-2" onClick={() => force("board")}>
          Force board
        </button>
        <button type="button" className="gold-btn h-8 rounded px-2" onClick={() => force("freeSpins")}>
          Force FS
        </button>
        <input
          className="h-8 w-14 rounded bg-navy px-1 text-cream"
          value={n}
          onChange={(e) => setN(Number(e.target.value) || 1)}
        />
        <button type="button" className="ghost-btn h-8 rounded px-2" onClick={() => skip(n)}>
          Square
        </button>
      </div>
    </div>
  );
}

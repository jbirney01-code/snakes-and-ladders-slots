import { useEffect } from "react";
import { loadSprites } from "@/game/assets";
import { unlockAudio } from "@/game/audio";
import { publicUrl } from "@/game/publicUrl";
import { useGame } from "@/game/store";
import { Lobby, SlotTable, Splash } from "./Shell";
import { BonusBoardView } from "./BonusBoardView";
import { Overlays } from "./Overlays";

export function GameApp() {
  const hydrated = useGame((s) => s.hydrated);
  const hydrate = useGame((s) => s.hydrate);
  const screen = useGame((s) => s.screen);
  const persist = useGame((s) => s.persistSlice);

  useEffect(() => {
    hydrate();
    void loadSprites();
  }, [hydrate]);

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    const hide = () => {
      if (document.visibilityState === "hidden") persist();
    };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", persist);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", persist);
    };
  }, [persist]);

  const poster = !hydrated || screen === "age" || screen === "splash" || screen === "lobby";

  return (
    <div className={poster ? "parlor parlor-poster" : "parlor"}>
      {poster ? (
        <div className="poster-stage">
          {!hydrated ? (
            <div className="poster-screen">
              <img src={publicUrl("/art/hero-age.jpg")} alt="" className="poster-art" />
              <div className="poster-shade" />
            </div>
          ) : (
            <>
              {(screen === "splash" || screen === "age") && <Splash />}
              {screen === "lobby" && <Lobby />}
              {screen === "lobby" && <Overlays />}
            </>
          )}
        </div>
      ) : (
        <div className="machine">
          {screen === "table" && <SlotTable />}
          {screen === "board" && <BonusBoardView />}
          <Overlays />
        </div>
      )}
    </div>
  );
}

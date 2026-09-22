import { publicUrl } from "./publicUrl";

const PATHS = [
  "/sprites/wild.png",
  "/sprites/ladder.png",
  "/sprites/cobra.png",
  "/sprites/banana.png",
  "/sprites/basket.png",
  "/sprites/dice.png",
  "/sprites/mini-ladder.png",
  "/sprites/tile.png",
  "/sprites/meeple-wood.png",
  "/sprites/meeple-crown.png",
  "/sprites/meeple-frog.png",
  "/sprites/meeple-candy.png",
  "/sprites/meeple-neon.png",
  "/sprites/coin-sack.png",
  "/sprites/chest.png",
  "/sprites/snake-peek.png",
  "/sprites/pop-cobra.png",
  "/sprites/pop-ladder.png",
  "/sprites/pop-coin.png",
  "/sprites/pop-chest.png",
  "/sprites/pop-star.png",
  "/sprites/pop-dice.png",
  "/sprites/pop-banana.png",
  "/sprites/pop-crown.png",
].map(publicUrl);

const cache = new Map<string, HTMLImageElement>();
let loaded = false;
let pending: Promise<void> | null = null;

export function getSprite(src: string): HTMLImageElement | null {
  return cache.get(src) ?? null;
}

export function loadSprites(): Promise<void> {
  if (loaded) return Promise.resolve();
  if (pending) return pending;
  pending = Promise.all(
    PATHS.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            cache.set(src, img);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = src;
        }),
    ),
  ).then(() => {
    loaded = true;
  });
  return pending;
}

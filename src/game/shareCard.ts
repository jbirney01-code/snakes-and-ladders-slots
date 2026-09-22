import { APP_NAME, TAGLINE } from "./constants";
import { formatLc } from "@/lib/utils";
import type { SharePayload } from "./types";

export async function renderShareCard(payload: SharePayload): Promise<Blob> {
  const w = 1200;
  const h = 630;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#0B1220");
  g.addColorStop(0.55, "#1a2a22");
  g.addColorStop(1, "#3A2040");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Felt oval
  ctx.fillStyle = "#16301f";
  ctx.beginPath();
  ctx.ellipse(w * 0.72, h * 0.55, 340, 220, -0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#FFC14A";
  ctx.font = "700 28px Fraunces, Georgia, serif";
  ctx.fillText(APP_NAME.toUpperCase(), 64, 80);
  ctx.fillStyle = "#FFF6EC";
  ctx.font = "600 18px Outfit, sans-serif";
  ctx.fillText(TAGLINE, 64, 112);

  ctx.fillStyle = "#FFF6EC";
  ctx.font = "800 64px Fraunces, Georgia, serif";
  wrapText(ctx, payload.title, 64, 220, 700, 72);

  ctx.fillStyle = "#3DFFA6";
  ctx.font = "700 42px Outfit, sans-serif";
  ctx.fillText(`+${formatLc(payload.amount)}`, 64, 430);

  ctx.fillStyle = "#FFC14A";
  ctx.font = "500 24px Outfit, sans-serif";
  ctx.fillText(payload.subtitle, 64, 480);

  if (payload.square) {
    ctx.fillStyle = "#FFF6EC";
    ctx.font = "600 22px Outfit, sans-serif";
    ctx.fillText(`Square ${payload.square}`, 64, 520);
  }

  ctx.fillStyle = "rgba(255,246,236,0.55)";
  ctx.font = "500 16px Outfit, sans-serif";
  ctx.fillText("Social play only  ·  Ladder Coins have no cash value", 64, 590);

  // Decorative dice
  drawDie(ctx, 980, 120, 88, 5);
  drawDie(ctx, 1060, 210, 72, 3);

  return await new Promise((res) => canvas.toBlob((b) => res(b ?? new Blob()), "image/png"));
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > max) {
      ctx.fillText(line, x, yy);
      line = w;
      yy += lh;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, yy);
}

function drawDie(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, n: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(0.18);
  ctx.fillStyle = "#FF5A8A";
  roundRect(ctx, 0, 0, s, s, 14);
  ctx.fill();
  ctx.fillStyle = "#FFF6EC";
  const pips: [number, number][][] = [
    [],
    [[0.5, 0.5]],
    [[0.25, 0.25], [0.75, 0.75]],
    [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
    [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
    [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
    [[0.25, 0.25], [0.75, 0.25], [0.25, 0.5], [0.75, 0.5], [0.25, 0.75], [0.75, 0.75]],
  ];
  for (const [px, py] of pips[n] ?? []) {
    ctx.beginPath();
    ctx.arc(px * s, py * s, s * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function shareOrDownload(payload: SharePayload) {
  const blob = await renderShareCard(payload);
  const file = new File([blob], "snakes-ladders-climb.png", { type: "image/png" });
  const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void>; canShare?: (d: ShareData) => boolean };
  try {
    if (nav.share && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], title: payload.title, text: payload.subtitle });
      return;
    }
  } catch {
    /* fall through to download */
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

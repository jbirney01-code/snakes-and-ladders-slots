#!/usr/bin/env python3
"""Chroma-key magenta JPEG sprite art to transparent PNGs."""
from __future__ import annotations

import os
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path("/workspace")
OUT = ROOT / "public" / "sprites"
OUT.mkdir(parents=True, exist_ok=True)

ASSETS = {
    "wild": "artifacts/imagine_images/cd49a87e-3122-495e-8960-4002005fd9fb.jpg",
    "ladder": "artifacts/imagine_images/fffcfd12-ef1e-4fb0-810a-56f7140e472d.jpg",
    "cobra": "artifacts/imagine_images/c391891f-c8cd-4720-a061-f5da3e072164.jpg",
    "banana": "artifacts/imagine_images/05d6aec7-9928-4029-a1d6-07a6633d5ce0.jpg",
    "basket": "artifacts/imagine_images/6bdf60d3-e858-4e91-8038-13dce40c570a.jpg",
    "dice": "artifacts/imagine_images/90e00019-9ceb-4fc4-a52b-6b015f41fdfa.jpg",
    "mini-ladder": "artifacts/imagine_images/e635a1b7-b4c5-4955-8298-eb0735e8210c.jpg",
    "meeple-wood": "artifacts/imagine_images/fbccaba4-277c-405b-aa1a-5b776a28be3d.jpg",
    "meeple-crown": "artifacts/imagine_images/ee90a584-0831-4a01-bbc4-38be6fdcb48b.jpg",
    "meeple-frog": "artifacts/imagine_images/af001ea1-fa96-4a3f-acf1-aeff4610cf6a.jpg",
    "meeple-candy": "artifacts/imagine_images/334b73bd-1168-4649-9a87-965ddd3120ad.jpg",
    "meeple-neon": "artifacts/imagine_images/d373a2d9-aa59-4957-a510-e98846f1ae98.jpg",
    "tile": "artifacts/imagine_images/d9bff160-0057-414c-aa35-1c828d3c02e6.jpg",
    "coin-sack": "artifacts/imagine_images/58ab6194-b22f-4c43-8de5-4a6e98fe4f23.jpg",
    "chest": "artifacts/imagine_images/f2de2680-a166-40ea-8c9c-fb1e44993241.jpg",
    "snake-peek": "artifacts/imagine_images/62b987da-b96a-4dd9-85f7-34c1a771a55e.jpg",
}


def chroma(src: Path, size: int = 320, wide: bool = False) -> Image.Image:
    im = Image.open(src).convert("RGBA")
    w, h = im.size
    # Drop the bottom watermark strip before keying.
    im = im.crop((0, 0, w, int(h * 0.93)))
    arr = np.array(im).astype(np.float32)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    dist = np.sqrt((r - 255.0) ** 2 + (g - 0.0) ** 2 + (b - 255.0) ** 2)
    mag = ((r > 170) & (b > 170) & (g < 110)) | (dist < 95)
    alpha = np.where(mag, 0.0, 255.0)
    # Feather the fringe.
    fringe = (~mag) & (dist < 160)
    alpha = np.where(fringe, np.clip((dist - 95) / 65.0 * 255.0, 0, 255), alpha)
    # Despill remaining magenta tint.
    spill = (alpha > 0) & (r > g + 25) & (b > g + 25)
    reduce = np.minimum(r - g, b - g) * 0.65
    r = np.where(spill, r - reduce, r)
    b = np.where(spill, b - reduce, b)
    arr[:, :, 0] = np.clip(r, 0, 255)
    arr[:, :, 1] = np.clip(g, 0, 255)
    arr[:, :, 2] = np.clip(b, 0, 255)
    arr[:, :, 3] = alpha
    out = Image.fromarray(arr.astype(np.uint8), "RGBA")
    bbox = out.getbbox()
    if bbox:
        pad = 6
        l, t, rr, bb = bbox
        l = max(0, l - pad)
        t = max(0, t - pad)
        rr = min(out.width, rr + pad)
        bb = min(out.height, bb + pad)
        out = out.crop((l, t, rr, bb))
    tw, th = out.size
    if wide:
        target_w, target_h = 640, 280
    else:
        target_w = target_h = size
    scale = min(target_w / tw, target_h / th)
    nw, nh = max(1, int(tw * scale)), max(1, int(th * scale))
    out = out.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
    canvas.paste(out, ((target_w - nw) // 2, (target_h - nh) // 2), out)
    return canvas


def main() -> None:
    for name, rel in ASSETS.items():
        src = ROOT / rel
        if not src.exists():
            print("MISSING", name, src)
            continue
        wide = name == "snake-peek"
        img = chroma(src, 320 if not wide else 640, wide=wide)
        dest = OUT / f"{name}.png"
        img.save(dest, "PNG")
        print("wrote", dest, img.size)


if __name__ == "__main__":
    main()

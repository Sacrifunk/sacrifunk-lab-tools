import { useEffect, useRef } from "react";

export interface CymaticsMiniProps {
  freq: number;
  size?: number;
}

/**
 * Chladni cymatics plate visualization on a circular domain.
 * Renders standing-wave nodal patterns derived from cos(n·π·x)·cos(m·π·y) - cos(m·π·x)·cos(n·π·y).
 */
export function CymaticsMini({ freq, size = 200 }: CymaticsMiniProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const s = freq / 50;
    const m = Math.max(1, Math.round(Math.sqrt(s)));
    const n = Math.max(1, Math.round(s / m));
    const img = ctx.createImageData(size, size);
    const cx = size / 2;
    const r = size / 2 - 1;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const nx = (x - cx) / r;
        const ny = (y - cx) / r;
        const idx = (y * size + x) * 4;
        if (nx * nx + ny * ny > 1) {
          img.data[idx] = 8;
          img.data[idx + 1] = 8;
          img.data[idx + 2] = 12;
          img.data[idx + 3] = 255;
          continue;
        }
        const v =
          Math.cos(n * Math.PI * nx) * Math.cos(m * Math.PI * ny) -
          Math.cos(m * Math.PI * nx) * Math.cos(n * Math.PI * ny);
        const isNode = Math.abs(v) < 0.06;
        if (isNode) {
          const b = 200 + Math.random() * 55;
          img.data[idx] = b;
          img.data[idx + 1] = b * 0.9;
          img.data[idx + 2] = b * 0.7;
        } else {
          const d = Math.floor(15 + Math.abs(v) * 25);
          img.data[idx] = d;
          img.data[idx + 1] = d;
          img.data[idx + 2] = d + 5;
        }
        img.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [freq, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      role="img"
      aria-label={`Chladni cymatics plate pattern at ${freq} hertz`}
      style={{
        borderRadius: "50%",
        border: "1px solid #2a2a4a",
      }}
    />
  );
}

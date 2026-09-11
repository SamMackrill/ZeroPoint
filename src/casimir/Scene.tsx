import { useEffect, useRef, useState } from 'react';
import { CasimirModel, extent, phase, type Zepton } from './model';

export type SceneLayers = { pressure: boolean; interactions: boolean; zeptons: boolean };
const cold = [71, 177, 217], warm = [242, 144, 89], base = [18, 32, 44];
export function Scene({ model, revision, layers, selected, onSelect }: {
  model: CasimirModel; revision: number; layers: SceneLayers; selected: number | null; onSelect: (p: Zepton) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const heat = useRef<HTMLCanvasElement | null>(null);
  const [sizeRevision, setSizeRevision] = useState(0);
  const geometry = useRef({ width: 1, height: 1, scale: 1 });
  useEffect(() => {
    const resize = new ResizeObserver(() => setSizeRevision(v => v + 1));
    resize.observe(canvas.current!); return () => resize.disconnect();
  }, []);
  useEffect(() => {
    const el = canvas.current!;
    function draw() {
      const ctx = el.getContext('2d'); if (!ctx) return;
      const width = el.clientWidth, height = el.clientHeight, dpr = Math.min(devicePixelRatio || 1, 2);
      if (!width || !height) return;
      if (el.width !== Math.round(width * dpr)) el.width = Math.round(width * dpr);
      if (el.height !== Math.round(height * dpr)) el.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const scale = Math.min(width / 13, (height - 90) / 5.5);
      geometry.current = { width, height, scale };
      const xy = (x: number, y: number) => [width / 2 + x * scale, height / 2 + y * scale];
      ctx.fillStyle = '#0e1a25'; ctx.fillRect(0, 0, width, height);
      if (layers.pressure) {
        // Sample exactly the same local pressure function as the numerical probes.
        const raster = heat.current ?? (heat.current = document.createElement('canvas'));
        const cols = 72, rows = Math.ceil(cols * height / width);
        if (raster.width !== cols) raster.width = cols;
        if (raster.height !== rows) raster.height = rows;
        const rasterContext = raster.getContext('2d')!;
        const pixels = rasterContext.createImageData(cols, rows);
        const contributors = model.particles.filter(p => p.contribution !== 0);
        for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) {
          const pressure = model.pressureAt(((x + .5) / cols * width - width / 2) / scale, ((y + .5) / rows * height - height / 2) / scale, contributors);
          const mix = Math.min(1, Math.abs(pressure - 1) / .45), to = pressure >= 1 ? warm : cold;
          const index = (y * cols + x) * 4;
          for (let c = 0; c < 3; c++) pixels.data[index + c] = Math.round(base[c] + (to[c] - base[c]) * mix);
          pixels.data[index + 3] = 255;
        }
        rasterContext.putImageData(pixels, 0, 0);
        ctx.imageSmoothingEnabled = true; ctx.drawImage(raster, 0, 0, width, height);
      }
      ctx.strokeStyle = '#97baca0d'; ctx.lineWidth = 1;
      for (let x = -6; x <= 6; x++) { const a = xy(x, -3), b = xy(x, 3); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
      for (let y = -2; y <= 2; y++) { const a = xy(-6, y), b = xy(6, y); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
      const arrow = (x: number, y: number, dx: number, dy: number, colour: string, weight = 1.5) => {
        const [sx, sy] = xy(x, y), ex = sx + dx * scale, ey = sy + dy * scale, angle = Math.atan2(dy, dx);
        ctx.strokeStyle = colour; ctx.lineWidth = weight; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey);
        ctx.moveTo(ex - 5 * Math.cos(angle - .5), ey - 5 * Math.sin(angle - .5)); ctx.lineTo(ex, ey); ctx.lineTo(ex - 5 * Math.cos(angle + .5), ey - 5 * Math.sin(angle + .5)); ctx.stroke();
      };
      if (layers.interactions) for (const p of model.particles) {
        const f = phase(p);
        if (p.gap && f < .6) {
          for (let i = 0; i < 4; i++) {
            const a = p.angle + i * Math.PI / 2, r = .22 + f * .35;
            arrow(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, Math.cos(a) * .14, Math.sin(a) * .14, '#ffc79299', 1);
          }
        } else if (p.neighbor !== null) {
          const q = model.particles.find(q => q.id === p.neighbor);
          if (q) { const [x, y] = xy(p.x, p.y), [qx, qy] = xy(q.x, q.y); ctx.beginPath(); ctx.setLineDash([2, 4]); ctx.strokeStyle = '#9be2f18c'; ctx.moveTo(x, y); ctx.lineTo(qx, qy); ctx.stroke(); ctx.setLineDash([]); arrow(q.x, q.y, (p.x - q.x) * .3, (p.y - q.y) * .3, '#a6e5f1', 1); }
        }
        if (p.deflected && f > .4 && f < .7) arrow(p.x, p.y, 0, Math.sign(p.y || 1) * .28, '#cfafd9', 1);
      }
      if (layers.zeptons) for (const p of model.particles) {
        const [x, y] = xy(p.x, p.y), f = phase(p), half = extent(p) * scale;
        ctx.globalAlpha = Math.min(1, f * 9, (1 - f) * 12) * (model.bridge(p) ? 1 : .55);
        if (f < .16 || p.id === selected) {
          ctx.beginPath(); ctx.arc(x, y, p.id === selected ? Math.max(10, half + 7) : 5 + f * 50, 0, Math.PI * 2);
          ctx.strokeStyle = p.id === selected ? '#e5e7a1' : '#b6f7d5'; ctx.lineWidth = 1; ctx.stroke();
        }
        const dx = Math.cos(p.angle) * half, dy = Math.sin(p.angle) * half;
        ctx.strokeStyle = '#bed3d8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - dx, y - dy); ctx.lineTo(x + dx, y + dy); ctx.stroke();
        for (const sign of [-1, 1]) {
          ctx.beginPath(); ctx.arc(x + sign * dx, y + sign * dy, Math.max(1.5, scale * .044), 0, Math.PI * 2);
          ctx.fillStyle = sign > 0 ? '#ffc095' : '#88d4f5'; ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      const left = model.left, right = model.right;
      for (const [x, positive, label] of [[left, false, 'electron'], [right, model.pair === 'electron-proton', model.pair === 'electron-proton' ? 'proton' : 'electron']] as const) {
        const [cx, cy] = xy(x, 0), r = Math.max(14, scale * .3);
        ctx.shadowBlur = 20; ctx.shadowColor = positive ? '#f3ad7555' : '#77b8ee55';
        ctx.fillStyle = positive ? '#774f39' : '#214b68'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.strokeStyle = positive ? '#ffc095' : '#91d6fa'; ctx.lineWidth = 1.4; ctx.stroke();
        ctx.font = '20px "DM Sans", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#f3f7fa'; ctx.fillText(positive ? '+' : '−', cx, cy + 6);
        ctx.font = '11px "DM Sans", sans-serif'; ctx.fillStyle = '#d7e4ec'; ctx.fillText(label, cx, cy + r + 22);
      }
      const direction = Math.sign(model.delta), length = Math.min(.95, Math.abs(model.delta) * 7);
      if (length > .015) {
        arrow(left, -.8, -direction * length, 0, '#dfedb5', 2.5);
        arrow(right, -.8, direction * length, 0, '#dfedb5', 2.5);
      }
      // Explicit inner and outer sampling sites make the pressure comparison readable.
      ctx.font = '10px "IBM Plex Mono", monospace'; ctx.textAlign = 'center';
      for (const [x, label] of [[left - 1, 'OUTER'], [model.midpoint, 'GAP'], [right + 1, 'OUTER']] as const) {
        const [cx, cy] = xy(x, 1.85); ctx.fillStyle = '#b6cbd7'; ctx.fillText(label, cx, cy);
        ctx.fillText(model.pressureAt(x, 0).toFixed(2), cx, cy + 16);
      }
      const [cx, cy] = xy(model.midpoint, 0); ctx.strokeStyle = '#fff9'; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.stroke();
    }
    draw();
  }, [model, revision, layers, selected, sizeRevision]);
  return <canvas ref={canvas} className="casimir-canvas" aria-label="Dynamic Zepton field with signed dipoles, interaction arrows and local pressure colour. Use Inspect newest Zepton for the accessible lifetime view."
    onClick={e => {
      if (!layers.zeptons) return;
      const rect = e.currentTarget.getBoundingClientRect(), { width, height, scale } = geometry.current;
      const x = (e.clientX - rect.left - width / 2) / scale, y = (e.clientY - rect.top - height / 2) / scale;
      let nearest: Zepton | undefined, distance = 22 / scale;
      for (const p of model.particles) { const d = Math.hypot(x - p.x, y - p.y); if (d < distance) { distance = d; nearest = p; } }
      if (nearest) onSelect(nearest);
    }} />;
}

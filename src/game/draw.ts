import type { CityId, Look } from "./content";

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  s: number;
};

export type Scene = {
  w: number;
  h: number;
  t: number;
  city: CityId;
  p: number;
  line: number;
  showBall: boolean;
  ring: boolean;
  ringHot: boolean;
  swing: number;
  look: Look;
  tape: string;
  board: string;
  flash: number;
  shake: number;
  callout: string;
  calloutLife: number;
  particles: Particle[];
  reduced: boolean;
  stumps: number;
  runup: number;
  cele: string;
};

type Pal = {
  skyTop: string;
  skyMid: string;
  ground: string;
  pitch: string;
  building: string;
  trim: string;
};

const PALS: Record<CityId, Pal> = {
  karachi: { skyTop: "#1a2744", skyMid: "#e39a58", ground: "#6a5c50", pitch: "#cbb892", building: "#241c18", trim: "#d7d2c8" },
  lahore: { skyTop: "#2a1828", skyMid: "#f0b36a", ground: "#5c4636", pitch: "#c48a52", building: "#3a2218", trim: "#f0a202" },
  multan: { skyTop: "#3a4a62", skyMid: "#e8c48a", ground: "#c2a36a", pitch: "#e0c07a", building: "#6a5038", trim: "#2f6b3a" },
  quetta: { skyTop: "#243044", skyMid: "#c9b59a", ground: "#8a7a68", pitch: "#cbbba4", building: "#3a4038", trim: "#d9d3c7" },
  islamabad: { skyTop: "#16342e", skyMid: "#f2c98a", ground: "#3d6a40", pitch: "#7ea05a", building: "#1c2e24", trim: "#2f6b3a" },
};

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

type Geom = { topY: number; botY: number; topHalf: number; botHalf: number; cx: number };

function geom(w: number, h: number): Geom {
  return { topY: h * 0.34, botY: h * 0.9, topHalf: w * 0.09, botHalf: w * 0.4, cx: w * 0.52 };
}

function at(g: Geom, z: number) {
  const y = g.botY + (g.topY - g.botY) * z;
  const half = g.botHalf + (g.topHalf - g.botHalf) * z;
  const scale = 1 - z * 0.74;
  return { y, half, scale, x: g.cx };
}

function sky(ctx: CanvasRenderingContext2D, w: number, h: number, pal: Pal, city: CityId) {
  const g = ctx.createLinearGradient(0, 0, 0, h * 0.55);
  g.addColorStop(0, pal.skyTop);
  g.addColorStop(0.55, pal.skyMid);
  g.addColorStop(1, "#f4ead7");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(255, 214, 150, 0.9)";
  ctx.beginPath();
  ctx.arc(w * 0.78, h * 0.16, Math.min(w, h) * 0.06, 0, Math.PI * 2);
  ctx.fill();
  if (city === "quetta") {
    ctx.fillStyle = "#6d6258";
    ctx.beginPath();
    ctx.moveTo(0, h * 0.32);
    ctx.lineTo(w * 0.22, h * 0.18);
    ctx.lineTo(w * 0.4, h * 0.3);
    ctx.lineTo(w * 0.62, h * 0.14);
    ctx.lineTo(w, h * 0.28);
    ctx.lineTo(w, h * 0.36);
    ctx.lineTo(0, h * 0.36);
    ctx.fill();
  }
  if (city === "karachi") {
    ctx.fillStyle = "#7ea0b8";
    ctx.fillRect(0, h * 0.3, w, h * 0.04);
  }
}

function buildings(ctx: CanvasRenderingContext2D, w: number, h: number, pal: Pal, city: CityId, t: number) {
  const base = h * 0.36;
  ctx.fillStyle = pal.building;
  const blocks = [
    [0.02, 0.16, 0.18],
    [0.18, 0.22, 0.16],
    [0.34, 0.12, 0.2],
    [0.52, 0.2, 0.14],
    [0.68, 0.15, 0.18],
    [0.84, 0.18, 0.12],
  ];
  for (const [x, bw, bh] of blocks) {
    const px = x * w;
    const py = base - bh * h;
    ctx.fillRect(px, py, bw * w, bh * h + 8);
    ctx.fillStyle = "rgba(244,234,215,0.35)";
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 2; col++) {
        const blink = Math.sin(t * 0.7 + x * 8 + row + col) > 0.2;
        if (!blink) continue;
        ctx.fillRect(px + 6 + col * (bw * w) * 0.4, py + 8 + row * 14, 6, 8);
      }
    }
    ctx.fillStyle = pal.building;
  }
  if (city === "karachi") {
    ctx.fillStyle = "#3a322c";
    const tx = w * 0.22;
    const ty = base - h * 0.2;
    ctx.fillRect(tx, ty, w * 0.08, h * 0.08);
    ctx.beginPath();
    ctx.ellipse(tx + w * 0.04, ty, w * 0.05, h * 0.02, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (city === "lahore") {
    ctx.strokeStyle = pal.trim;
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      const x = w * (0.15 + i * 0.22);
      ctx.beginPath();
      ctx.moveTo(x, base);
      ctx.lineTo(x, base - h * 0.08);
      ctx.stroke();
      ctx.fillStyle = "#f0a202";
      ctx.beginPath();
      ctx.arc(x, base - h * 0.08, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.strokeStyle = "rgba(180,180,190,0.45)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, base - 20);
  ctx.quadraticCurveTo(w * 0.3, base - 50, w * 0.55, base - 18);
  ctx.quadraticCurveTo(w * 0.8, base + 6, w, base - 30);
  ctx.stroke();
}

function sideProps(ctx: CanvasRenderingContext2D, w: number, h: number, city: CityId) {
  if (city !== "multan" && city !== "islamabad") return;
  const y = h * 0.42;
  ctx.fillStyle = city === "islamabad" ? "#1e4630" : "#245c32";
  const spots = [w * 0.08, w * 0.9];
  for (const px of spots) {
    ctx.beginPath();
    ctx.moveTo(px, y + h * 0.08);
    ctx.lineTo(px - 18, y + h * 0.08);
    ctx.lineTo(px, y - h * (city === "islamabad" ? 0.12 : 0.08));
    ctx.lineTo(px + 18, y + h * 0.08);
    ctx.fill();
    ctx.fillRect(px - 2, y + h * 0.06, 4, h * 0.06);
  }
}

function pitch(ctx: CanvasRenderingContext2D, g: Geom, pal: Pal, board: string) {
  ctx.fillStyle = pal.ground;
  ctx.fillRect(0, g.topY - 8, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = pal.pitch;
  ctx.beginPath();
  ctx.moveTo(g.cx - g.topHalf, g.topY);
  ctx.lineTo(g.cx + g.topHalf, g.topY);
  ctx.lineTo(g.cx + g.botHalf, g.botY);
  ctx.lineTo(g.cx - g.botHalf, g.botY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(244,234,215,0.85)";
  ctx.lineWidth = 2;
  const near = at(g, 0.12);
  const far = at(g, 0.84);
  ctx.beginPath();
  ctx.moveTo(near.x - near.half * 0.55, near.y);
  ctx.lineTo(near.x + near.half * 0.55, near.y);
  ctx.moveTo(far.x - far.half * 0.7, far.y);
  ctx.lineTo(far.x + far.half * 0.7, far.y);
  ctx.stroke();
  ctx.fillStyle = board === "board-neon" ? "#1a3a34" : board === "board-crest" ? "#3a2a10" : "#5a4632";
  const bx = g.cx - g.botHalf * 0.15;
  ctx.fillRect(bx, g.botY - 8, g.botHalf * 0.9, 18);
}

function stumps(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, fly: number) {
  ctx.save();
  ctx.translate(x, y);
  if (fly > 0) ctx.rotate(fly * 0.8);
  const h = 46 * scale;
  const gap = 7 * scale;
  ctx.fillStyle = "#f4ead7";
  for (let i = -1; i <= 1; i++) {
    ctx.fillRect(i * gap - 1.5 * scale, -h, 3 * scale, h);
  }
  ctx.fillStyle = "#f0a202";
  ctx.fillRect(-gap - 2, -h - 3 * scale, gap * 2 + 4, 3 * scale);
  ctx.restore();
}

function bowler(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, runup: number, released: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  const arm = released ? 1.2 : Math.sin(runup * Math.PI) * 1.1;
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(0, 4, 16, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1c140e";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-4, 0);
  ctx.lineTo(-7, 16);
  ctx.moveTo(4, 0);
  ctx.lineTo(8, 16);
  ctx.stroke();
  ctx.fillStyle = "#2f6b3a";
  roundRect(ctx, -8, -22, 16, 22, 4);
  ctx.fill();
  ctx.fillStyle = "#c48a62";
  ctx.beginPath();
  ctx.arc(0, -30, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#c48a62";
  ctx.beginPath();
  ctx.moveTo(6, -16);
  ctx.lineTo(16, -16 - arm * 14);
  ctx.stroke();
  ctx.fillStyle = "#f4f1ea";
  ctx.beginPath();
  ctx.arc(16, -16 - arm * 14, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function batter(ctx: CanvasRenderingContext2D, x: number, y: number, swing: number, look: Look, tape: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(0, 6, 28, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#2a1c14";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-6, -6);
  ctx.lineTo(-10, 18);
  ctx.moveTo(6, -6);
  ctx.lineTo(12, 18);
  ctx.stroke();
  ctx.fillStyle = look === "tied" ? "#2f6f6a" : "#d98a3a";
  roundRect(ctx, -16, -48, 32, 42, 8);
  ctx.fill();
  ctx.fillStyle = "#c48a62";
  ctx.beginPath();
  ctx.arc(0, -62, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a120e";
  if (look === "tied") {
    ctx.beginPath();
    ctx.arc(0, -66, 12, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(10, -58, 5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillRect(-12, -74, 24, 10);
    roundRect(ctx, -13, -78, 26, 8, 3);
    ctx.fill();
  }
  const ang = -1.05 + swing * 2.15;
  ctx.save();
  ctx.translate(10, -36);
  ctx.rotate(ang);
  ctx.fillStyle = "#8a5a32";
  roundRect(ctx, -4, -58, 8, 62, 3);
  ctx.fill();
  ctx.fillStyle = tape;
  ctx.fillRect(-4, -46, 8, 5);
  ctx.fillRect(-4, -34, 8, 4);
  ctx.fillStyle = "#f4ead7";
  roundRect(ctx, -3, 0, 6, 14, 2);
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

function ball(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(x, y + r * 2.2, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f7f4ee";
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#d7d2c8";
  ctx.lineWidth = Math.max(1, r * 0.18);
  ctx.beginPath();
  ctx.arc(x, y, r * 0.55, 0.4, 2.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.55, 2.8, 5.2);
  ctx.stroke();
}

function ring(ctx: CanvasRenderingContext2D, x: number, y: number, hot: boolean, p: number) {
  const radius = 18 + (1 - Math.min(1, Math.max(0, p))) * 54;
  ctx.lineWidth = hot ? 7 : 4;
  ctx.strokeStyle = hot ? "#3dbe6e" : p > 0.92 ? "#e24b3b" : "#f4ead7";
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  if (hot) {
    ctx.fillStyle = "rgba(61,190,110,0.18)";
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawScene(ctx: CanvasRenderingContext2D, s: Scene) {
  const { w, h } = s;
  const pal = PALS[s.city];
  const g = geom(w, h);
  const mag = s.reduced ? 0 : s.shake * s.shake;
  const ox = Math.sin(s.t * 47) * 10 * mag;
  const oy = Math.cos(s.t * 39) * 8 * mag;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.translate(ox, oy);
  sky(ctx, w, h, pal, s.city);
  buildings(ctx, w, h, pal, s.city, s.t);
  pitch(ctx, g, pal, s.board);
  sideProps(ctx, w, h, s.city);
  const far = at(g, 0.9);
  const bowX = far.x + Math.sin(s.runup * 8) * 6 * (s.p < 0 ? 1 : 0);
  bowler(ctx, bowX, far.y, Math.max(0.35, far.scale), s.runup, s.p >= 0);
  stumps(ctx, far.x, far.y, Math.max(0.35, far.scale), 0);
  const z = s.showBall ? 1 - Math.min(1, Math.max(0, s.p)) : 0.92;
  const spot = at(g, z);
  const bx = spot.x + s.line * spot.half * 0.75;
  if (s.showBall) ball(ctx, bx, spot.y - 10 * spot.scale, Math.max(4, 16 * spot.scale));
  const near = at(g, 0.08);
  const batX = near.x - near.half * 0.05;
  batter(ctx, batX, near.y, s.swing, s.look, s.tape);
  stumps(ctx, near.x + near.half * 0.22, near.y, 1, s.stumps);
  if (s.ring) ring(ctx, batX + 18, near.y - 70, s.ringHot, Math.max(0, s.p));
  for (const p of s.particles) {
    if (p.life <= 0) continue;
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (s.callout && s.calloutLife > 0) {
    ctx.globalAlpha = Math.min(1, s.calloutLife * 2);
    ctx.fillStyle = "#f4ead7";
    ctx.font = `600 ${Math.floor(h * 0.07)}px Teko, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(s.callout.toUpperCase(), w * 0.5, h * 0.24);
    ctx.globalAlpha = 1;
  }
  if (s.flash > 0) {
    ctx.fillStyle = `rgba(244,234,215,${s.flash * 0.35})`;
    ctx.fillRect(-20, -20, w + 40, h + 40);
  }
  ctx.restore();
}

export function makePool(): Particle[] {
  return Array.from({ length: 48 }, () => ({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    max: 1,
    color: "#f4ead7",
    s: 2,
  }));
}

export function emit(pool: Particle[], x: number, y: number, color: string, n: number) {
  let left = n;
  for (const p of pool) {
    if (left <= 0) break;
    if (p.life > 0) continue;
    const a = Math.random() * Math.PI * 2;
    const sp = 40 + Math.random() * 140;
    p.x = x;
    p.y = y;
    p.vx = Math.cos(a) * sp;
    p.vy = Math.sin(a) * sp - 40;
    p.life = 0.35 + Math.random() * 0.3;
    p.max = p.life;
    p.color = color;
    p.s = 2 + Math.random() * 3;
    left -= 1;
  }
}

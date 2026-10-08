import {
  type BallPlan,
  type Bi,
  type CityId,
  BOWLERS,
  CITIES,
  cityById,
  GHOSTS,
  type Length,
  type ShotKind,
  TIMING_COSTS,
} from "./content";

export type DeliveryResult = {
  runs: number;
  wicket: boolean;
  quality: "perfect" | "good" | "miss" | "wicket" | "dot";
  label: string;
  note: "four" | "six" | "single" | "double" | "dot" | "bowled" | "caught" | "blocked";
};

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function newSeed() {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] || 1;
  }
  return (Date.now() ^ 0x9e3779b9) >>> 0;
}

function nudge(length: Length) {
  if (length === "yorker") return -0.07;
  if (length === "full") return -0.02;
  if (length === "short") return 0.06;
  return 0;
}

export function planOver(seed: number, bowlerId: string): BallPlan[] {
  const rng = mulberry32(seed);
  const bowler = BOWLERS.find((b) => b.id === bowlerId) ?? BOWLERS[0];
  const balls: BallPlan[] = [];
  for (let i = 0; i < 6; i++) {
    const roll = rng();
    const length: Length = roll < 0.16 ? "yorker" : roll < 0.4 ? "full" : roll < 0.78 ? "good" : "short";
    const arrive = Math.max(0.78, 1.36 - bowler.pace * 0.46 + nudge(length) + (rng() - 0.5) * 0.05);
    balls.push({
      arrive,
      line: rng() * 1.6 - 0.8,
      length,
      luck: rng(),
      pace: bowler.pace,
    });
  }
  return balls;
}

export function timingWindow(level: number, bowlerId: string, fair: boolean) {
  const bowler = BOWLERS.find((b) => b.id === bowlerId) ?? BOWLERS[0];
  const lvl = fair ? 0 : Math.max(0, Math.min(5, level));
  const base = 0.12 + lvl * 0.014;
  return base * (fair ? 1 : bowler.windowMul);
}

function dot(note: DeliveryResult["note"] = "dot"): DeliveryResult {
  return { runs: 0, wicket: false, quality: "dot", label: "dot", note };
}

function boundary(runs: 4 | 6): DeliveryResult {
  return {
    runs,
    wicket: false,
    quality: "perfect",
    label: runs === 6 ? "chakka!" : "chaucca!",
    note: runs === 6 ? "six" : "four",
  };
}

export function judge(
  plan: BallPlan,
  swingAt: number | null,
  kind: ShotKind,
  windowSec: number,
): DeliveryResult {
  if (swingAt == null) {
    if (plan.length === "short") return dot();
    return { runs: 0, wicket: true, quality: "wicket", label: "out!", note: "bowled" };
  }
  const dt = swingAt - plan.arrive;
  const ad = Math.abs(dt);
  if (ad <= windowSec) {
    if (kind === "defend") return { runs: 0, wicket: false, quality: "perfect", label: "shabash", note: "blocked" };
    if (kind === "loft") return boundary(6);
    return boundary(4);
  }
  if (ad <= windowSec * 2.15) {
    if (kind === "defend") return { runs: 0, wicket: false, quality: "good", label: "shabash", note: "blocked" };
    if (kind === "loft") {
      if (plan.luck < 0.42) return boundary(6);
      if (plan.luck < 0.78) {
        return { runs: 0, wicket: true, quality: "wicket", label: "out!", note: "caught" };
      }
      return dot();
    }
    if (dt < 0) {
      const runs = plan.luck < 0.55 ? 1 : 2;
      return {
        runs,
        wicket: false,
        quality: "good",
        label: "shabash",
        note: runs === 2 ? "double" : "single",
      };
    }
    return { runs: 1, wicket: false, quality: "good", label: "shabash", note: "single" };
  }
  if (kind === "defend" && ad <= windowSec * 3.3) {
    return { runs: 0, wicket: false, quality: "good", label: "shabash", note: "blocked" };
  }
  if (dt > 0) return { runs: 0, wicket: true, quality: "wicket", label: "out!", note: "bowled" };
  return { runs: 0, wicket: false, quality: "miss", label: "dot", note: "dot" };
}

export function pktParts(d = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
  const parts = Object.fromEntries(fmt.formatToParts(d).map((p) => [p.type, p.value]));
  const y = Number(parts.year);
  const m = Number(parts.month);
  const day = Number(parts.day);
  const order = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const wd = order.indexOf(parts.weekday ?? "Mon");
  return { y, m, day, wd: wd < 0 ? 1 : wd };
}

export function pktDate(d = new Date()) {
  const { y, m, day } = pktParts(d);
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function weekKey(d = new Date()) {
  const { y, m, day, wd } = pktParts(d);
  const mondayOffset = (wd + 6) % 7;
  const utc = new Date(Date.UTC(y, m - 1, day - mondayOffset));
  return utc.toISOString().slice(0, 10);
}

export function dayDiff(a: string, b: string) {
  const ap = a.split("-").map(Number);
  const bp = b.split("-").map(Number);
  if (ap.length < 3 || bp.length < 3) return 0;
  const A = Date.UTC(ap[0], ap[1] - 1, ap[2]);
  const B = Date.UTC(bp[0], bp[1] - 1, bp[2]);
  return Math.round((B - A) / 86400000);
}

export function timingCost(level: number) {
  return TIMING_COSTS[Math.max(0, Math.min(5, level))] ?? 0;
}

export function nextTimingCost(level: number) {
  if (level >= 5) return 0;
  return TIMING_COSTS[level + 1] ?? 0;
}

export type Pulse = { id: CityId; runs: number };

export function cityPulse(week: string): Pulse[] {
  return CITIES.map((c) => {
    const n = hashStr(`${week}:${c.id}:pulse`) % 90;
    return { id: c.id, runs: 120 + n };
  }).sort((a, b) => b.runs - a.runs);
}

export type LadderRow = { name: Bi; score: number; you: boolean };

export function ladderRows(city: CityId, week: string, playerScore: number, you: Bi): LadderRow[] {
  const rng = mulberry32(hashStr(`${week}:${city}:board`));
  const rows: LadderRow[] = GHOSTS.map((name) => ({
    name,
    score: 6 + Math.floor(rng() * 20),
    you: false,
  }));
  rows.push({ name: you, score: playerScore, you: true });
  rows.sort((a, b) => b.score - a.score || (a.you ? -1 : 1));
  return rows;
}

export function encodeChallenge(street: CityId, seed: number, score: number) {
  const code = cityById(street).code;
  return `GXI-${code}-${(seed >>> 0).toString(36).toUpperCase()}-${score}`;
}

export function decodeChallenge(raw: string): { street: CityId; seed: number; score: number } | null {
  const m = /^GXI-([A-Z]{3})-([0-9A-Z]+)-(\d+)$/.exec(raw.trim().toUpperCase());
  if (!m) return null;
  const city = CITIES.find((c) => c.code === m[1]);
  if (!city) return null;
  const seed = parseInt(m[2], 36);
  const score = Number(m[3]);
  if (!Number.isFinite(seed) || !Number.isFinite(score) || score < 0 || score > 36) return null;
  return { street: city.id, seed: seed >>> 0, score };
}

export function coinReward(score: number, par: number, rewardMul: number, home: boolean) {
  const made = score >= par;
  const base = made ? 36 + Math.max(0, score - par) * 10 : 8;
  const city = home ? 1.2 : 1;
  return { made, coins: Math.round(base * rewardMul * city), points: made ? 8 + Math.max(0, score - par) : 1 };
}

export const ENERGY_CAP = 5;
export const REGEN_MS = 20 * 60 * 1000;
export const AD_CAP = 8;
export const INTERSTITIAL_GAP = 4 * 60 * 1000;

export function applyRegen(energy: number, energyAt: number, now: number) {
  if (energy >= ENERGY_CAP) return { energy, energyAt };
  const gained = Math.floor((now - energyAt) / REGEN_MS);
  if (gained <= 0) return { energy, energyAt };
  const next = Math.min(ENERGY_CAP, energy + gained);
  const at = next >= ENERGY_CAP ? now : energyAt + gained * REGEN_MS;
  return { energy: next, energyAt: at };
}

export function msUntilEnergy(energy: number, energyAt: number, now: number) {
  if (energy >= ENERGY_CAP || now <= 0) return 0;
  const elapsed = Math.max(0, now - energyAt);
  return REGEN_MS - (elapsed % REGEN_MS);
}

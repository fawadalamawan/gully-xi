import { useSyncExternalStore } from "react";
import type { CityId, Look } from "./content";
import { applyRegen, dayDiff, pktDate, weekKey } from "./sim";

export type Save = {
  version: 1;
  lang: "ur" | "en";
  coins: number;
  tokens: number;
  energy: number;
  energyAt: number;
  oversFinished: number;
  adsToday: number;
  adsDay: string;
  tutorialDone: boolean;
  streets: CityId[];
  bowlers: string[];
  owned: string[];
  bat: string;
  board: string;
  cele: string;
  look: Look;
  timingLevel: number;
  homeCity: CityId;
  street: CityId;
  bowler: string;
  week: string;
  bestByCity: Partial<Record<CityId, number>>;
  rankPoints: number;
  crateDay: string;
  giftTape: boolean;
  crest: boolean;
  noAdsUntil: number;
  lastInterstitialAt: number;
  sessionCount: number;
  sound: boolean;
  shake: boolean;
  seasonXp: number;
  seasonPrem: boolean;
  seasonFree: number[];
  seasonPremClaimed: number[];
  beatenCodes: string[];
  firstDay: string;
  lastDay: string;
  adRewards: number;
  iapPreviews: number;
};

const KEY = "gully-xi-v1";

export function defaultSave(): Save {
  return {
    version: 1,
    lang: "ur",
    coins: 0,
    tokens: 0,
    energy: 5,
    energyAt: 0,
    oversFinished: 0,
    adsToday: 0,
    adsDay: "",
    tutorialDone: false,
    streets: ["karachi", "lahore"],
    bowlers: ["tape"],
    owned: ["bat-tape", "board-plain", "cele-shabash"],
    bat: "bat-tape",
    board: "board-plain",
    cele: "cele-shabash",
    look: "short",
    timingLevel: 0,
    homeCity: "karachi",
    street: "karachi",
    bowler: "tape",
    week: "",
    bestByCity: {},
    rankPoints: 0,
    crateDay: "",
    giftTape: false,
    crest: false,
    noAdsUntil: 0,
    lastInterstitialAt: 0,
    sessionCount: 0,
    sound: true,
    shake: true,
    seasonXp: 0,
    seasonPrem: false,
    seasonFree: [],
    seasonPremClaimed: [],
    beatenCodes: [],
    firstDay: "",
    lastDay: "",
    adRewards: 0,
    iapPreviews: 0,
  };
}

const SERVER_SAVE = defaultSave();
let state: Save = defaultSave();
const listeners = new Set<() => void>();
let timer = 0;
let booted = false;

function emit() {
  for (const l of listeners) l();
}

function writeNow() {
  if (typeof window === "undefined") return;
  try {
    const raw = JSON.stringify(state);
    window.localStorage.setItem(KEY + "-bak", window.localStorage.getItem(KEY) ?? "");
    window.localStorage.setItem(KEY, raw);
  } catch {
    /* private mode / quota — keep the session in memory */
  }
}

function scheduleWrite() {
  if (typeof window === "undefined") return;
  window.clearTimeout(timer);
  timer = window.setTimeout(writeNow, 60);
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getSave() {
  return state;
}

export function useSave() {
  return useSyncExternalStore(subscribe, getSave, () => SERVER_SAVE);
}

export function patchSave(partial: Partial<Save>) {
  state = { ...state, ...partial };
  emit();
  scheduleWrite();
}

export function updateSave(fn: (s: Save) => Save) {
  state = fn(state);
  emit();
  scheduleWrite();
}

function asCity(v: unknown, fallback: CityId): CityId {
  const ids: CityId[] = ["karachi", "lahore", "multan", "quetta", "islamabad"];
  return ids.includes(v as CityId) ? (v as CityId) : fallback;
}

function normalize(raw: Partial<Save>): Save {
  const base = defaultSave();
  const best = raw.bestByCity && typeof raw.bestByCity === "object" ? raw.bestByCity : {};
  return {
    ...base,
    ...raw,
    version: 1,
    lang: raw.lang === "en" ? "en" : "ur",
    streets: Array.isArray(raw.streets) && raw.streets.length ? raw.streets.map((c) => asCity(c, "karachi")) : base.streets,
    bowlers: Array.isArray(raw.bowlers) && raw.bowlers.length ? raw.bowlers.filter((b) => typeof b === "string") : base.bowlers,
    owned: Array.isArray(raw.owned) ? raw.owned.filter((id) => typeof id === "string") : base.owned,
    bestByCity: best,
    seasonFree: Array.isArray(raw.seasonFree) ? raw.seasonFree.filter((n) => typeof n === "number") : [],
    seasonPremClaimed: Array.isArray(raw.seasonPremClaimed)
      ? raw.seasonPremClaimed.filter((n) => typeof n === "number")
      : [],
    beatenCodes: Array.isArray(raw.beatenCodes) ? raw.beatenCodes.filter((c) => typeof c === "string").slice(-40) : [],
    homeCity: asCity(raw.homeCity, "karachi"),
    street: asCity(raw.street, "karachi"),
    look: raw.look === "tied" ? "tied" : "short",
    bat: typeof raw.bat === "string" ? raw.bat : base.bat,
    board: typeof raw.board === "string" ? raw.board : base.board,
    cele: typeof raw.cele === "string" ? raw.cele : base.cele,
    bowler: typeof raw.bowler === "string" ? raw.bowler : "tape",
  };
}

export function bootSave(now = Date.now()) {
  if (booted) return state;
  booted = true;
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Save>;
        if (parsed && parsed.version === 1) state = normalize(parsed);
      }
    } catch {
      state = defaultSave();
    }
    window.addEventListener("pagehide", writeNow);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") writeNow();
    });
  }
  const today = pktDate(new Date(now));
  const week = weekKey(new Date(now));
  const regen = applyRegen(state.energy, state.energyAt || now, now);
  const next: Save = {
    ...state,
    ...regen,
    sessionCount: state.sessionCount + 1,
    adsToday: state.adsDay === today ? state.adsToday : 0,
    adsDay: today,
    week,
    bestByCity: state.week === week ? state.bestByCity : {},
    firstDay: state.firstDay || today,
    lastDay: today,
  };
  if (!next.crest && next.firstDay && dayDiff(next.firstDay, today) >= 6) {
    next.crest = true;
    if (!next.owned.includes("board-crest")) next.owned = [...next.owned, "board-crest"];
  }
  state = next;
  emit();
  writeNow();
  return state;
}

export function resetSave() {
  state = defaultSave();
  state.energyAt = Date.now();
  state.tutorialDone = true;
  emit();
  writeNow();
}

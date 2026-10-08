export type Lang = "ur" | "en";
export type CityId = "karachi" | "lahore" | "multan" | "quetta" | "islamabad";
export type Look = "short" | "tied";
export type Length = "yorker" | "full" | "good" | "short";
export type ShotKind = "ground" | "loft" | "defend";
export type Script = "free" | "freeze-green" | "auto-six";

export type BallPlan = {
  arrive: number;
  line: number;
  length: Length;
  luck: number;
  pace: number;
};

export type Bi = { ur: string; en: string };

export type City = {
  id: CityId;
  code: string;
  par: number;
  cost: number;
  name: Bi;
  place: Bi;
};

export type Bowler = {
  id: string;
  cost: number;
  pace: number;
  windowMul: number;
  reward: number;
  name: Bi;
  blurb: Bi;
};

export type ItemKind = "bat" | "board" | "cele";

export type Item = {
  id: string;
  kind: ItemKind;
  tape: string;
  costCoins: number;
  costTokens: number;
  name: Bi;
};

export const CITIES: City[] = [
  {
    id: "karachi",
    code: "KHI",
    par: 12,
    cost: 0,
    name: { ur: "کراچی", en: "Karachi" },
    place: { ur: "چھت", en: "Rooftop" },
  },
  {
    id: "lahore",
    code: "LHR",
    par: 10,
    cost: 0,
    name: { ur: "لاہور", en: "Lahore" },
    place: { ur: "گلی", en: "Gali" },
  },
  {
    id: "multan",
    code: "MUX",
    par: 14,
    cost: 350,
    name: { ur: "ملتان", en: "Multan" },
    place: { ur: "میدان", en: "Ground" },
  },
  {
    id: "quetta",
    code: "UET",
    par: 11,
    cost: 650,
    name: { ur: "کوئٹہ", en: "Quetta" },
    place: { ur: "پہاڑی گلی", en: "Hill lane" },
  },
  {
    id: "islamabad",
    code: "ISB",
    par: 13,
    cost: 900,
    name: { ur: "اسلام آباد", en: "Islamabad" },
    place: { ur: "پارک", en: "Park" },
  },
];

export const BOWLERS: Bowler[] = [
  {
    id: "tape",
    cost: 0,
    pace: 0.32,
    windowMul: 1,
    reward: 1,
    name: { ur: "ٹیپ کڈ", en: "Tape kid" },
    blurb: { ur: "آسان رفتار", en: "Easy pace" },
  },
  {
    id: "gali",
    cost: 200,
    pace: 0.58,
    windowMul: 0.86,
    reward: 1.25,
    name: { ur: "گلی ایکسپریس", en: "Gali express" },
    blurb: { ur: "تیز، زیادہ سکے", en: "Quicker, more coins" },
  },
  {
    id: "yorker",
    cost: 500,
    pace: 0.84,
    windowMul: 0.74,
    reward: 1.5,
    name: { ur: "چھت یارکر", en: "Rooftop yorker" },
    blurb: { ur: "تنگ ونڈو", en: "Tight window" },
  },
];

export const ITEMS: Item[] = [
  { id: "bat-tape", kind: "bat", tape: "#f4f1ea", costCoins: 0, costTokens: 0, name: { ur: "سفید ٹیپ", en: "White tape" } },
  { id: "bat-green", kind: "bat", tape: "#3dbe6e", costCoins: 80, costTokens: 0, name: { ur: "ہری ٹیپ", en: "Green tape" } },
  { id: "bat-lahore", kind: "bat", tape: "#f0a202", costCoins: 0, costTokens: 2, name: { ur: "لاہور رات", en: "Lahore night" } },
  { id: "bat-multan", kind: "bat", tape: "#d4783a", costCoins: 120, costTokens: 0, name: { ur: "ملتان مٹی", en: "Multan dust" } },
  { id: "bat-sea", kind: "bat", tape: "#8fd4e4", costCoins: 0, costTokens: 0, name: { ur: "سمندر ٹیپ", en: "Sea tape" } },
  { id: "bat-stone", kind: "bat", tape: "#e4dcc8", costCoins: 0, costTokens: 3, name: { ur: "پتھر ٹیپ", en: "Stone tape" } },
  { id: "board-plain", kind: "board", tape: "#c4a574", costCoins: 0, costTokens: 0, name: { ur: "سادہ بورڈ", en: "Plain board" } },
  { id: "board-neon", kind: "board", tape: "#7ed0b8", costCoins: 100, costTokens: 0, name: { ur: "نیون بورڈ", en: "Neon board" } },
  { id: "board-crest", kind: "board", tape: "#f0a202", costCoins: 0, costTokens: 0, name: { ur: "شہری نشان", en: "City crest" } },
  { id: "cele-shabash", kind: "cele", tape: "#f0a202", costCoins: 0, costTokens: 0, name: { ur: "شاباش", en: "Shabash" } },
  { id: "cele-bhangra", kind: "cele", tape: "#e24b3b", costCoins: 0, costTokens: 0, name: { ur: "رنگ", en: "Color burst" } },
  { id: "cele-roar", kind: "cele", tape: "#f4ead7", costCoins: 0, costTokens: 2, name: { ur: "چھت کا شور", en: "Rooftop roar" } },
];

export const TIMING_COSTS = [0, 120, 200, 320, 480, 700];

export const GHOSTS: Bi[] = [
  { ur: "حمید", en: "Hamid" },
  { ur: "سارہ", en: "Sara" },
  { ur: "بلال", en: "Bilal" },
  { ur: "عائشہ", en: "Ayesha" },
  { ur: "عثمان", en: "Usman" },
  { ur: "فاطمہ", en: "Fatima" },
  { ur: "کامران", en: "Kamran" },
  { ur: "حنا", en: "Hina" },
  { ur: "زین", en: "Zain" },
  { ur: "میحک", en: "Mehak" },
  { ur: "فرح", en: "Farah" },
  { ur: "جُنید", en: "Junaid" },
];

export const CRATE_ODDS: { id: string; p: number; ur: string; en: string }[] = [
  { id: "coins", p: 0.7, ur: "۷۰٪ — ۵۰ گلی سکے", en: "70% — 50 street coins" },
  { id: "token", p: 0.22, ur: "۲۲٪ — ۱ چمک ٹوکن", en: "22% — 1 glow token" },
  { id: "cosmetic", p: 0.08, ur: "۸٪ — نایاب کاسمیٹک، ورنہ ۸۰ سکے", en: "8% — rare cosmetic, else 80 coins" },
];

export const SEASON_TIERS: { xp: number; freeCoins: number; freeTokens: number; premItem: string | null; premCoins: number; premTokens: number }[] = [
  { xp: 15, freeCoins: 40, freeTokens: 0, premItem: "cele-bhangra", premCoins: 0, premTokens: 0 },
  { xp: 40, freeCoins: 50, freeTokens: 0, premItem: null, premCoins: 0, premTokens: 1 },
  { xp: 70, freeCoins: 60, freeTokens: 0, premItem: "bat-lahore", premCoins: 0, premTokens: 0 },
  { xp: 110, freeCoins: 0, freeTokens: 1, premItem: "cele-roar", premCoins: 0, premTokens: 0 },
  { xp: 160, freeCoins: 80, freeTokens: 0, premItem: null, premCoins: 150, premTokens: 0 },
  { xp: 220, freeCoins: 80, freeTokens: 0, premItem: "bat-sea", premCoins: 0, premTokens: 0 },
];

export function cityById(id: CityId): City {
  return CITIES.find((c) => c.id === id) ?? CITIES[0];
}

export function bowlerById(id: string): Bowler {
  return BOWLERS.find((b) => b.id === id) ?? BOWLERS[0];
}

export function itemById(id: string): Item | undefined {
  return ITEMS.find((i) => i.id === id);
}

export function tx(lang: Lang, text: Bi): string {
  return text[lang];
}

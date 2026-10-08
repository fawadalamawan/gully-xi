import {
  Check,
  ChevronLeft,
  Coins,
  Flag,
  Gift,
  Lock,
  MapPin,
  Settings,
  Share2,
  Sparkles,
  Store,
  Timer,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { bindAudioVisibility, playCoin, setMuted, startBed, unlockAudio } from "./audio";
import {
  BOWLERS,
  CITIES,
  CRATE_ODDS,
  ITEMS,
  SEASON_TIERS,
  type CityId,
  type Item,
  type ShotKind,
  bowlerById,
  cityById,
  itemById,
  tx,
} from "./content";
import { PitchCanvas } from "./PitchCanvas";
import {
  AD_CAP,
  ENERGY_CAP,
  INTERSTITIAL_GAP,
  applyRegen,
  cityPulse,
  coinReward,
  dayDiff,
  decodeChallenge,
  encodeChallenge,
  ladderRows,
  msUntilEnergy,
  newSeed,
  nextTimingCost,
  pktDate,
  planOver,
  timingWindow,
  weekKey,
  type DeliveryResult,
} from "./sim";
import { bootSave, getSave, patchSave, resetSave, updateSave, useSave, type Save } from "./store";

type Mode = "quick" | "derby" | "challenge" | "tutorial";
type Screen = "home" | "prep" | "play" | "result" | "shop" | "ladder" | "challenge" | "season" | "settings";

type Live = {
  matchId: number;
  mode: Mode;
  street: CityId;
  bowler: string;
  seed: number;
  plans: ReturnType<typeof planOver>;
  index: number;
  score: number;
  wickets: number;
  log: DeliveryResult[];
  phase: "bowl" | "save" | "done" | "tut-done";
  playId: number;
  ghost: number | null;
  code: string | null;
  derbyLeg: number;
  derbyWins: number;
  derbyLoss: number;
  script: "free" | "freeze-green" | "auto-six";
  windowSec: number;
  mercy: boolean;
  saved: boolean;
};

type Reward = {
  score: number;
  par: number;
  made: boolean;
  coins: number;
  points: number;
  log: DeliveryResult[];
  street: CityId;
  mode: Mode;
  seed: number;
  ghost: number | null;
  beatGhost: boolean;
  bonus: string;
  derbyWins: number;
  derbyLoss: number;
  derbyDone: boolean;
  derbyLeg: number;
  bowler: string;
  code: string;
  challengeCode: string | null;
  showInterstitial: boolean;
  gift: boolean;
  doubled: boolean;
};

type Modal =
  | null
  | { type: "energy" }
  | { type: "ad"; reason: "energy" | "replay" | "double" | "wicket" | "crate" }
  | { type: "iap"; id: string }
  | { type: "odds" }
  | { type: "interstitial" }
  | { type: "gift" }
  | { type: "forfeit" }
  | { type: "reset" };

const settledKeys = new Set<string>();
let matchSeq = 1;

const btn = "copy inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 text-base disabled:opacity-40";
const primary = `${btn} w-full bg-amber text-lg text-amber-ink`;
const quiet = `${btn} border border-line bg-panel text-cream`;

function tr(lang: Save["lang"], ur: string, en: string) {
  return lang === "ur" ? ur : en;
}

function clock(ms: number) {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function rollCosmetic(owned: string[]) {
  const roll = Math.random();
  if (roll < 0.7) return { coins: 50, tokens: 0, item: null as string | null };
  if (roll < 0.92) return { coins: 0, tokens: 1, item: null as string | null };
  const pool = ITEMS.filter((item) => !owned.includes(item.id));
  if (!pool.length) return { coins: 80, tokens: 0, item: null as string | null };
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return { coins: 0, tokens: 0, item: pick?.id ?? null };
}

export function GameApp() {
  const save = useSave();
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(0);
  const [screen, setScreen] = useState<Screen>("home");
  const [live, setLive] = useState<Live | null>(null);
  const [reward, setReward] = useState<Reward | null>(null);
  const [arm, setArm] = useState<ShotKind>("ground");
  const [modal, setModal] = useState<Modal>(null);
  const [notice, setNotice] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [reduced, setReduced] = useState(false);
  const [prepMode, setPrepMode] = useState<"quick" | "derby">("quick");
  const [ladderCity, setLadderCity] = useState<CityId>("karachi");
  const afterRef = useRef<(() => void) | null>(null);
  const lang = save.lang;
  const dir = lang === "ur" ? "rtl" : "ltr";

  useEffect(() => {
    const booted = bootSave();
    bindAudioVisibility();
    setMuted(!booted.sound);
    setLadderCity(booted.homeCity);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    setNow(Date.now());
    setReady(true);
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!ready || !now) return;
    const s = getSave();
    const regen = applyRegen(s.energy, s.energyAt || now, now);
    if (regen.energy !== s.energy || regen.energyAt !== s.energyAt) patchSave(regen);
  }, [now, ready]);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(id);
  }, [notice]);

  useEffect(() => {
    if (!live) return;
    if (live.phase === "tut-done") {
      const key = `tut-${live.matchId}`;
      if (settledKeys.has(key)) return;
      settledKeys.add(key);
      patchSave({ tutorialDone: true });
      setLive(null);
      setScreen("home");
      setNotice(tr(getSave().lang, "گلی یاد رہی۔ اب اوور تمہارا ہے۔", "You have the gali. The next over is yours."));
      return;
    }
    if (live.phase === "done") settle(live);
  }, [live]);

  function poke() {
    unlockAudio();
    if (getSave().sound) startBed();
  }

  function say(ur: string, en: string) {
    setNotice(tr(lang, ur, en));
  }

  function adsRemaining() {
    const s = getSave();
    const today = pktDate();
    const used = s.adsDay === today ? s.adsToday : 0;
    return Math.max(0, AD_CAP - used);
  }

  function takeEnergy() {
    const s = getSave();
    const at = Date.now();
    const regen = applyRegen(s.energy, s.energyAt || at, at);
    if (regen.energy <= 0) return false;
    const wasFull = regen.energy >= ENERGY_CAP;
    patchSave({ energy: regen.energy - 1, energyAt: wasFull ? at : regen.energyAt });
    return true;
  }

  function markAd() {
    const s = getSave();
    const today = pktDate();
    const used = s.adsDay === today ? s.adsToday : 0;
    if (used >= AD_CAP) return false;
    patchSave({ adsToday: used + 1, adsDay: today, adRewards: s.adRewards + 1 });
    return true;
  }

  function begin(opts: {
    mode: Mode;
    street: CityId;
    bowler: string;
    seed: number;
    ghost?: number | null;
    code?: string | null;
    derbyLeg?: number;
    derbyWins?: number;
    derbyLoss?: number;
  }) {
    const fair = opts.mode === "challenge";
    const tutorial = opts.mode === "tutorial";
    const matchId = matchSeq++;
    setArm("ground");
    setReward(null);
    setLive({
      matchId,
      mode: opts.mode,
      street: opts.street,
      bowler: opts.bowler,
      seed: opts.seed,
      plans: planOver(opts.seed, opts.bowler),
      index: 0,
      score: 0,
      wickets: 0,
      log: [],
      phase: "bowl",
      playId: 1,
      ghost: opts.ghost ?? null,
      code: opts.code ?? null,
      derbyLeg: opts.derbyLeg ?? 1,
      derbyWins: opts.derbyWins ?? 0,
      derbyLoss: opts.derbyLoss ?? 0,
      script: tutorial ? "freeze-green" : "free",
      windowSec: tutorial ? 0.3 : timingWindow(getSave().timingLevel, opts.bowler, fair),
      mercy: false,
      saved: false,
    });
    setScreen("play");
    poke();
  }

  function settle(match: Live) {
    const key = String(match.matchId);
    if (settledKeys.has(key)) return;
    settledKeys.add(key);
    const s = getSave();
    const par = cityById(match.street).par;
    const mult = match.mode === "challenge" ? 1 : bowlerById(match.bowler).reward;
    const pay = coinReward(match.score, par, mult, s.homeCity === match.street);
    const boundaries = match.log.filter((ball) => ball.runs >= 4).length;
    const xp = 14 + boundaries * 5;
    const overs = s.oversFinished + 1;
    const gift = overs >= 5 && !s.giftTape;
    const owned = new Set(s.owned);
    let extraCoins = 0;
    let extraTokens = 0;
    if (gift) {
      if (!owned.has("bat-sea")) owned.add("bat-sea");
      else extraCoins += 40;
    }
    const challengeCode = match.code;
    const beatGhost = match.mode === "challenge" && match.ghost != null && match.score > match.ghost;
    let bonus = "";
    if (beatGhost && challengeCode && !s.beatenCodes.includes(challengeCode)) {
      const crate = rollCosmetic([...owned]);
      extraCoins += crate.coins;
      extraTokens += crate.tokens;
      if (crate.item) owned.add(crate.item);
      const item = crate.item ? itemById(crate.item) : undefined;
      bonus = item
        ? tr(s.lang, `کریٹ: ${item.name.ur}`, `Crate: ${item.name.en}`)
        : crate.tokens
          ? tr(s.lang, "کریٹ: ۱ چمک ٹوکن", "Crate: 1 glow token")
          : tr(s.lang, `کریٹ: ${crate.coins} سکے`, `Crate: ${crate.coins} coins`);
    }
    const madeWins = pay.made ? 1 : 0;
    const derbyWins = match.derbyWins + (match.mode === "derby" ? madeWins : 0);
    const derbyLoss = match.derbyLoss + (match.mode === "derby" && !pay.made ? 1 : 0);
    const derbyDone = match.mode !== "derby" || derbyWins >= 2 || derbyLoss >= 2 || match.derbyLeg >= 3;
    const showInterstitial =
      pay.made &&
      overs % 3 === 0 &&
      s.sessionCount >= 2 &&
      s.noAdsUntil < Date.now() &&
      Date.now() - s.lastInterstitialAt >= INTERSTITIAL_GAP;
    updateSave((prev) => ({
      ...prev,
      coins: prev.coins + pay.coins + extraCoins,
      tokens: prev.tokens + extraTokens,
      rankPoints: prev.rankPoints + pay.points,
      seasonXp: prev.seasonXp + xp,
      oversFinished: overs,
      giftTape: prev.giftTape || gift,
      owned: [...owned],
      bestByCity: { ...prev.bestByCity, [match.street]: Math.max(prev.bestByCity[match.street] ?? 0, match.score) },
      beatenCodes:
        beatGhost && challengeCode && !prev.beatenCodes.includes(challengeCode)
          ? [...prev.beatenCodes, challengeCode].slice(-40)
          : prev.beatenCodes,
    }));
    setReward({
      score: match.score,
      par,
      made: pay.made,
      coins: pay.coins + extraCoins,
      points: pay.points,
      log: match.log,
      street: match.street,
      mode: match.mode,
      seed: match.seed,
      ghost: match.ghost,
      beatGhost,
      bonus,
      derbyWins,
      derbyLoss,
      derbyDone,
      derbyLeg: match.derbyLeg,
      bowler: match.bowler,
      code: encodeChallenge(match.street, match.seed, match.score),
      challengeCode,
      showInterstitial,
      gift,
      doubled: false,
    });
    setLive(null);
    setScreen("result");
    if (getSave().sound) playCoin();
    if (gift) setModal({ type: "gift" });
  }

  function onDelivery(result: DeliveryResult) {
    setLive((prev) => {
      if (!prev) return prev;
      if (prev.mode === "tutorial" && prev.index === 0 && (result.wicket || result.runs <= 0)) {
        return { ...prev, playId: prev.playId + 1, phase: "bowl" };
      }
      const log = [...prev.log, result];
      const score = prev.score + result.runs;
      const index = prev.index + 1;
      const wickets = prev.wickets + (result.wicket ? 1 : 0);
      if (prev.mode === "tutorial") {
        if (index === 1) {
          return { ...prev, log, score, index, wickets, phase: "bowl", playId: prev.playId + 1, script: "auto-six", windowSec: 0.2, mercy: false };
        }
        if (index === 2) {
          return { ...prev, log, score, index, wickets, phase: "bowl", playId: prev.playId + 1, script: "free", windowSec: 0.18, mercy: true };
        }
        return { ...prev, log, score, index, wickets, phase: "tut-done" };
      }
      if (result.wicket && index < 6 && !prev.saved) {
        return { ...prev, log, score, index, wickets, phase: "save" };
      }
      if (result.wicket || index >= 6) return { ...prev, log, score, index, wickets, phase: "done" };
      return { ...prev, log, score, index, wickets, phase: "bowl", playId: prev.playId + 1, mercy: false };
    });
    setArm("ground");
  }

  function openAd(reason: Extract<Modal, { type: "ad" }>["reason"], then: () => void) {
    if (adsRemaining() <= 0) {
      say("آج کے ۸ اشتہار ختم۔", "Today's 8 rewarded ads are used.");
      return;
    }
    afterRef.current = then;
    setModal({ type: "ad", reason });
  }

  function finishAd() {
    if (!markAd()) {
      setModal(null);
      return;
    }
    const then = afterRef.current;
    afterRef.current = null;
    setModal(null);
    then?.();
  }

  function leave(after: () => void) {
    if (reward?.showInterstitial) {
      setReward({ ...reward, showInterstitial: false });
      patchSave({ lastInterstitialAt: Date.now() });
      afterRef.current = after;
      setModal({ type: "interstitial" });
      return;
    }
    after();
  }

  function equip(item: Item) {
    if (item.kind === "bat") patchSave({ bat: item.id });
    if (item.kind === "board") patchSave({ board: item.id });
    if (item.kind === "cele") patchSave({ cele: item.id });
  }

  function buyItem(item: Item) {
    const s = getSave();
    if (s.owned.includes(item.id)) {
      equip(item);
      return;
    }
    const locked = item.costCoins === 0 && item.costTokens === 0;
    if (locked) {
      say("یہ انعام سے کھلتا ہے۔", "This one comes from a reward, not the shop.");
      return;
    }
    if (s.coins < item.costCoins || s.tokens < item.costTokens) {
      say("سکے یا ٹوکن کم ہیں۔", "Not enough coins or tokens.");
      return;
    }
    updateSave((p) => ({
      ...p,
      coins: p.coins - item.costCoins,
      tokens: p.tokens - item.costTokens,
      owned: [...p.owned, item.id],
      bat: item.kind === "bat" ? item.id : p.bat,
      board: item.kind === "board" ? item.id : p.board,
      cele: item.kind === "cele" ? item.id : p.cele,
    }));
  }

  function grantPack(id: string) {
    updateSave((p) => {
      const owned = new Set(p.owned);
      let coins = p.coins;
      let tokens = p.tokens;
      let noAdsUntil = p.noAdsUntil;
      let seasonPrem = p.seasonPrem;
      if (id === "starter") {
        owned.add("bat-sea");
        noAdsUntil = Date.now() + 7 * 86400000;
      } else if (id === "c100") coins += 400;
      else if (id === "c250") coins += 1200;
      else if (id === "c500") coins += 2800;
      else if (id === "pass") seasonPrem = true;
      return { ...p, owned: [...owned], coins, tokens, noAdsUntil, seasonPrem, iapPreviews: p.iapPreviews + 1 };
    });
    setModal(null);
    say("پریویو انلاک ہو گیا۔ پیسے نہیں کٹے۔", "Preview unlocked. Nothing was charged.");
  }

  function claimDaily() {
    const s = getSave();
    if (s.crateDay === pktDate()) return;
    const crate = rollCosmetic(s.owned);
    updateSave((p) => ({
      ...p,
      coins: p.coins + crate.coins,
      tokens: p.tokens + crate.tokens,
      owned: crate.item && !p.owned.includes(crate.item) ? [...p.owned, crate.item] : p.owned,
      crateDay: pktDate(),
    }));
    const item = crate.item ? itemById(crate.item) : undefined;
    setModal(null);
    say(
      item ? `ملا: ${item.name.ur}` : crate.tokens ? "ملا: ۱ ٹوکن" : `ملے: ${crate.coins} سکے`,
      item ? `Got ${item.name.en}` : crate.tokens ? "Got 1 token" : `Got ${crate.coins} coins`,
    );
  }

  function claimTier(index: number, prem: boolean) {
    const tier = SEASON_TIERS[index];
    if (!tier) return;
    const s = getSave();
    if (s.seasonXp < tier.xp) return;
    if (prem && !s.seasonPrem) return;
    if (!prem && s.seasonFree.includes(index)) return;
    if (prem && s.seasonPremClaimed.includes(index)) return;
    updateSave((p) => {
      const owned = new Set(p.owned);
      let coins = p.coins + (prem ? tier.premCoins : tier.freeCoins);
      let tokens = p.tokens + (prem ? tier.premTokens : tier.freeTokens);
      const itemId = prem ? tier.premItem : null;
      if (itemId) {
        if (owned.has(itemId)) coins += 40;
        else owned.add(itemId);
      }
      return {
        ...p,
        coins,
        tokens,
        owned: [...owned],
        seasonFree: prem ? p.seasonFree : [...p.seasonFree, index],
        seasonPremClaimed: prem ? [...p.seasonPremClaimed, index] : p.seasonPremClaimed,
      };
    });
  }

  const regen = now ? applyRegen(save.energy, save.energyAt || now, now) : { energy: save.energy, energyAt: save.energyAt };
  const wait = msUntilEnergy(regen.energy, regen.energyAt, now);
  const pulse = cityPulse(save.week || weekKey());
  const lead = pulse[0];
  const chase = pulse[1];
  const tape = itemById(save.bat)?.tape ?? "#f4f1ea";
  const plan = live?.plans[live.index];

  function shareText(code: string, score: number, street: CityId) {
    const name = tx(lang, cityById(street).name);
    return tr(
      lang,
      `گلی الیون — ${name}\nمیرا سکور ${score}\nکوڈ: ${code}\nایک اوور۔ ایک گلی۔`,
      `Gully XI — ${name}\nMy score ${score}\nCode: ${code}\nOne over. One street.`,
    );
  }

  async function share(text: string) {
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        say("کوڈ کاپی ہو گیا۔", "Code copied.");
      }
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        say("کوڈ کاپی ہو گیا۔", "Code copied.");
      } catch {
        say("شیئر نہیں ہوا۔", "Couldn't share.");
      }
    }
  }

  if (!ready) {
    return (
      <main className="app-sky flex h-dvh flex-col items-center justify-center px-6 text-center">
        <p className="score text-6xl text-amber">GULLY XI</p>
        <h1 className="copy mt-3 text-3xl">گلی الیون</h1>
        <p className="copy mt-2 text-muted">{tr("ur", "ایک اوور۔ ایک گلی۔ تمہارا شہر۔", "One over. One street. Your city.")}</p>
      </main>
    );
  }

  return (
    <main dir={dir} className="app-sky relative mx-auto flex h-dvh max-w-md flex-col overflow-hidden text-cream" onPointerDown={poke}>
      {screen === "home" ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-2 px-4 pt-4">
            <button type="button" data-testid="lang-toggle" className={quiet} onClick={() => patchSave({ lang: lang === "ur" ? "en" : "ur" })}>
              {lang === "ur" ? "English" : "اردو"}
            </button>
            <div className="flex items-center gap-2">
              <Pill>
                <Coins className="size-4 text-amber" />
                <span>{save.coins}</span>
              </Pill>
              <Pill>
                <Sparkles className="size-4 text-glow" />
                <span>{save.tokens}</span>
              </Pill>
              <Pill>
                <Zap className="size-4 text-amber" />
                <span>
                  {regen.energy}/{ENERGY_CAP}
                </span>
              </Pill>
            </div>
          </header>
          <div className="px-4 pt-5">
            <p className="score text-5xl text-amber">GULLY XI</p>
            <h1 className="copy mt-1 text-3xl">{tr(lang, "گلی الیون", "Street cricket")}</h1>
            <p className="copy text-muted">{tr(lang, "ایک اوور۔ ایک گلی۔ تمہارا شہر۔", "One over. One street. Your city.")}</p>
          </div>
          {lead && chase ? (
            <p className="copy mx-4 mt-4 rounded-2xl border border-line bg-panel px-4 py-3 text-sm">
              {tr(
                lang,
                `${tx(lang, cityById(lead.id).name)} ${tx(lang, cityById(chase.id).name)} سے ${lead.runs - chase.runs} رنز آگے ہے`,
                `${tx(lang, cityById(lead.id).name)} is ${lead.runs - chase.runs} runs ahead of ${tx(lang, cityById(chase.id).name)}`,
              )}
            </p>
          ) : null}
          <div className="mt-4 flex gap-3 overflow-x-auto px-4 pb-1">
            {CITIES.map((city) => {
              const open = save.streets.includes(city.id);
              const on = save.street === city.id;
              return (
                <button
                  key={city.id}
                  type="button"
                  onClick={() => {
                    if (!open) {
                      if (save.coins < city.cost) say("اس گلی کے لیے سکے کم ہیں۔", "Not enough coins for this street.");
                      else patchSave({ coins: save.coins - city.cost, streets: [...save.streets, city.id], street: city.id });
                      return;
                    }
                    patchSave({ street: city.id });
                  }}
                  className={`copy min-h-24 min-w-36 shrink-0 rounded-2xl border px-3 py-2 text-start ${on ? "border-amber bg-panel-2" : "border-line bg-panel"}`}
                >
                  <span className="score block text-2xl text-amber">{city.code}</span>
                  <span className="block">{tx(lang, city.name)}</span>
                  <span className="block text-sm text-muted">
                    {open ? `${tx(lang, city.place)} · ${tr(lang, "ہدف", "Par")} ${city.par}` : <Lock className="inline size-4" />}
                    {!open ? ` ${city.cost}` : ""}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-auto flex flex-col gap-3 px-4 pt-4 pb-5">
            {regen.energy <= 0 ? <p className="copy text-center text-sm text-muted">{tr(lang, `اگلا اوور ${clock(wait)}`, `Next over ${clock(wait)}`)}</p> : null}
            <button
              type="button"
              data-testid="play-over"
              className={primary}
              onClick={() => {
                poke();
                if (!save.tutorialDone) {
                  begin({ mode: "tutorial", street: "karachi", bowler: "tape", seed: 2026 });
                  return;
                }
                setPrepMode("quick");
                setScreen("prep");
              }}
            >
              {tr(lang, save.tutorialDone ? "اوور کھیلو" : "پہلی گیند", "Play over")}
            </button>
            {save.tutorialDone ? (
              <div className="grid grid-cols-3 gap-2">
                <button type="button" className={quiet} onClick={() => { setPrepMode("derby"); setScreen("prep"); }}>
                  <Flag className="size-4" />
                  {tr(lang, "ڈربی", "Derby")}
                </button>
                <button type="button" className={quiet} onClick={() => setScreen("challenge")}>
                  <Users className="size-4" />
                  {tr(lang, "دوست", "Friend")}
                </button>
                <button type="button" className={quiet} onClick={() => setScreen("ladder")}>
                  <Trophy className="size-4" />
                  {tr(lang, "سیڑھی", "Ladder")}
                </button>
              </div>
            ) : null}
            <div className="grid grid-cols-3 gap-2">
              <button type="button" className={quiet} onClick={() => setScreen("shop")}>
                <Store className="size-4" />
                {tr(lang, "دکان", "Shop")}
              </button>
              <button type="button" className={quiet} onClick={() => setScreen("season")}>
                <Timer className="size-4" />
                {tr(lang, "لیگ", "League")}
              </button>
              <button type="button" className={quiet} onClick={() => setScreen("settings")}>
                <Settings className="size-4" />
                {tr(lang, "ترتیبات", "Settings")}
              </button>
            </div>
            {save.tutorialDone && save.crateDay !== pktDate() ? (
              <button type="button" className={quiet} onClick={() => setModal({ type: "odds" })}>
                <Gift className="size-4 text-amber" />
                {tr(lang, "آج کا مفت کریٹ", "Today's free crate")}
              </button>
            ) : null}
            {save.firstDay && dayDiff(save.firstDay, pktDate()) >= 1 ? (
              <p className="copy text-center text-sm text-muted">{tr(lang, "دوست کو واٹس ایپ کوڈ بھیجو۔", "Send a friend the WhatsApp code.")}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {screen === "prep" ? (
        <section className="flex min-h-0 flex-1 flex-col px-4 pt-4 pb-5">
          <Back label={tr(lang, "واپس", "Back")} onClick={() => setScreen("home")} />
          <h2 className="copy mt-3 text-3xl">{prepMode === "derby" ? tr(lang, "اسٹریٹ ڈربی", "Street derby") : tr(lang, "فوری اوور", "Quick over")}</h2>
          <p className="copy text-muted">
            {tx(lang, cityById(save.street).name)} · {tx(lang, cityById(save.street).place)} · {tr(lang, "ہدف", "Par")} {cityById(save.street).par}
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {BOWLERS.map((bowler) => {
              const owned = save.bowlers.includes(bowler.id);
              const on = save.bowler === bowler.id;
              return (
                <button
                  key={bowler.id}
                  type="button"
                  className={`copy min-h-16 rounded-2xl border px-4 py-2 text-start ${on ? "border-amber bg-panel-2" : "border-line bg-panel"}`}
                  onClick={() => {
                    if (!owned) {
                      if (save.coins < bowler.cost) say("باؤلر کے لیے سکے کم ہیں۔", "Not enough coins for this bowler.");
                      else patchSave({ coins: save.coins - bowler.cost, bowlers: [...save.bowlers, bowler.id], bowler: bowler.id });
                      return;
                    }
                    patchSave({ bowler: bowler.id });
                  }}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span>{tx(lang, bowler.name)}</span>
                    <span className="score text-xl text-amber">{owned ? `${bowler.reward}x` : bowler.cost}</span>
                  </span>
                  <span className="block text-sm text-muted">{tx(lang, bowler.blurb)}</span>
                </button>
              );
            })}
          </div>
          <p className="copy mt-4 text-sm text-muted">
            {tr(lang, "ٹائمنگ خریدنے سے ونڈو تھوڑی کشادہ ہوتی ہے۔ دکان کے بلا پے ٹو ون نہیں۔", "Timing practice widens the window a little. Shop bats do not.")}
          </p>
          <button
            type="button"
            className={`${primary} mt-auto`}
            onClick={() => {
              if (!takeEnergy()) {
                setModal({ type: "energy" });
                return;
              }
              begin({ mode: prepMode, street: save.street, bowler: save.bowler, seed: newSeed() });
            }}
          >
            {tr(lang, "شروع", "Start")} · 1 {tr(lang, "اوور", "over")}
          </button>
        </section>
      ) : null}

      {screen === "play" && live ? (
        <section className="flex min-h-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-2 px-4 pt-3">
            <button type="button" className="flex size-12 items-center justify-center rounded-full border border-line bg-panel" onClick={() => setModal({ type: "forfeit" })} aria-label={tr(lang, "واپس", "Back")}>
              <ChevronLeft className="size-5 rtl:rotate-180" />
            </button>
            <div className="text-center">
              <p className="score text-5xl text-amber">{live.score}</p>
              <p className="copy text-xs text-muted">
                {tx(lang, cityById(live.street).name)} · {tr(lang, "ہدف", "Par")} {cityById(live.street).par}
              </p>
            </div>
            <div className="flex gap-1" dir="ltr">
              {Array.from({ length: 6 }, (_, i) => {
                const ball = live.log[i];
                return (
                  <span key={i} className={`score flex h-8 w-6 items-center justify-center rounded-md border text-sm ${ball?.wicket ? "border-wicket text-wicket" : "border-line text-cream"}`}>
                    {ball ? (ball.wicket ? "W" : ball.runs) : "·"}
                  </span>
                );
              })}
            </div>
          </header>
          <div className="relative min-h-0 flex-1">
            {live.phase === "bowl" && plan ? (
              <PitchCanvas
                key={live.playId}
                city={live.street}
                plan={plan}
                windowSec={live.windowSec}
                script={live.script}
                look={save.look}
                tape={tape}
                board={save.board}
                cele={save.cele}
                arm={arm}
                reduced={reduced || !save.shake}
                shakeOn={save.shake && !reduced}
                mercy={live.mercy}
                onDone={onDelivery}
              />
            ) : (
              <div className="flex h-full items-center justify-center px-6 text-center">
                <div>
                  <p className="score text-6xl text-wicket">OUT</p>
                  <p className="copy mt-2">{tr(lang, "وکٹ گر گئی۔ اشتہار سے یہ گیند معاف ہو سکتی ہے۔", "Wicket down. A sponsor card can wipe this ball.")}</p>
                </div>
              </div>
            )}
          </div>
          <footer className="flex flex-col gap-2 px-4 pt-2 pb-4">
            <p className="copy text-center text-sm text-muted">
              {live.mode === "tutorial" && live.script === "freeze-green"
                ? tr(lang, "جب حلقہ سبز ہو، ٹیپ کرو۔", "Tap when the ring is green.")
                : live.mode === "tutorial" && live.script === "auto-six"
                  ? tr(lang, "دیکھو — یہ چھکا ہے۔", "Watch — that's a six.")
                  : live.mode === "tutorial"
                    ? tr(lang, "اب خود کرو۔", "Your ball.")
                    : tr(lang, "ٹیپ = شاٹ۔ ہولڈ یا اوپر = چھکا۔ نیچے = دفاع۔", "Tap to swing. Hold or swipe up to loft. Down defends.")}
            </p>
            {live.mode !== "tutorial" ? (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className={`${quiet} ${arm === "defend" ? "border-amber" : ""}`} onClick={() => setArm("defend")}>
                  {tr(lang, "دفاع", "Defend")}
                </button>
                <button type="button" className={`${quiet} ${arm === "loft" ? "border-amber" : ""}`} onClick={() => setArm("loft")}>
                  {tr(lang, "چھکا", "Loft")}
                </button>
              </div>
            ) : (
              <button type="button" className={quiet} onClick={() => { patchSave({ tutorialDone: true }); setLive(null); setScreen("home"); }}>
                {tr(lang, "چھوڑ دو", "Skip")}
              </button>
            )}
            {live.phase === "save" ? (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className={primary} onClick={() => openAd("wicket", () => {
                  setLive((prev) => {
                    if (!prev) return prev;
                    const log = prev.log.map((ball, i) =>
                      i === prev.log.length - 1 ? { ...ball, wicket: false, runs: 0, quality: "dot" as const, label: "shabash", note: "dot" as const } : ball,
                    );
                    return { ...prev, log, wickets: Math.max(0, prev.wickets - 1), phase: "bowl", playId: prev.playId + 1, saved: true };
                  });
                })}>
                  {tr(lang, "معاف", "Save")}
                </button>
                <button type="button" className={quiet} onClick={() => setLive((prev) => (prev ? { ...prev, phase: "done" } : prev))}>
                  {tr(lang, "اوور ختم", "End over")}
                </button>
              </div>
            ) : null}
          </footer>
        </section>
      ) : null}

      {screen === "result" && reward ? (
        <section className="flex min-h-0 flex-1 flex-col px-4 pt-6 pb-5">
          <p className="copy text-center text-muted">{tx(lang, cityById(reward.street).name)}</p>
          <p data-testid="result-score" className="score text-center text-8xl text-amber">{reward.score}</p>
          <p className="copy text-center text-lg">{reward.made ? tr(lang, "ہدف پورا", "Par made") : tr(lang, "ہدف رہ گیا", "Short of par")} · {reward.par}</p>
          <div className="mt-4 flex justify-center gap-2" dir="ltr">
            {Array.from({ length: 6 }, (_, i) => {
              const ball = reward.log[i];
              return (
                <span key={i} className="score flex h-12 w-10 items-center justify-center rounded-xl border border-line bg-panel text-2xl">
                  {ball ? (ball.wicket ? "W" : ball.runs) : "·"}
                </span>
              );
            })}
          </div>
          <p className="copy mt-4 text-center">
            +{reward.coins} {tr(lang, "سکے", "coins")} · +{reward.points} {tr(lang, "پوائنٹ", "pts")}
            {reward.doubled ? ` · ${tr(lang, "دگنا", "doubled")}` : ""}
          </p>
          {reward.bonus ? <p className="copy text-center text-amber">{reward.bonus}</p> : null}
          {reward.mode === "derby" ? (
            <p className="copy text-center text-muted">
              {tr(lang, "ڈربی", "Derby")} {reward.derbyWins}-{reward.derbyLoss}
              {reward.derbyDone ? (reward.derbyWins > reward.derbyLoss ? tr(lang, " · جیت", " · won") : tr(lang, " · ہار", " · lost")) : ""}
            </p>
          ) : null}
          {reward.ghost != null ? (
            <p className="copy text-center text-muted">
              {tr(lang, "دوست", "Friend")} {reward.ghost} · {reward.beatGhost ? tr(lang, "آگے نکل گئے", "You passed them") : tr(lang, "پیچھے رہے", "Still behind")}
            </p>
          ) : null}
          <div className="mt-auto flex flex-col gap-2">
            {!reward.made && reward.mode !== "tutorial" ? (
              <button type="button" className={primary} onClick={() => openAd("replay", () => begin({
                mode: reward.mode === "challenge" ? "challenge" : reward.mode === "derby" ? "derby" : "quick",
                street: reward.street,
                bowler: reward.mode === "challenge" ? "tape" : reward.bowler,
                seed: reward.seed,
                ghost: reward.ghost,
                code: reward.challengeCode,
                derbyLeg: reward.derbyLeg,
                derbyWins: reward.derbyWins,
                derbyLoss: reward.derbyLoss,
              }))}>
                {tr(lang, "اشتہار — یہی اوور دوبارہ", "Sponsor card — replay this over")}
              </button>
            ) : null}
            {reward.made && !reward.doubled ? (
              <button type="button" className={quiet} onClick={() => openAd("double", () => {
                updateSave((p) => ({ ...p, coins: p.coins + reward.coins }));
                setReward({ ...reward, doubled: true, coins: reward.coins * 2 });
              })}>
                {tr(lang, "اشتہار — سکے دگنے", "Sponsor card — double coins")}
              </button>
            ) : null}
            {reward.mode === "derby" && !reward.derbyDone ? (
              <button type="button" className={primary} onClick={() => leave(() => {
                if (!takeEnergy()) {
                  setScreen("home");
                  setModal({ type: "energy" });
                  return;
                }
                begin({
                  mode: "derby",
                  street: reward.street,
                  bowler: reward.bowler,
                  seed: newSeed(),
                  derbyLeg: reward.derbyLeg + 1,
                  derbyWins: reward.derbyWins,
                  derbyLoss: reward.derbyLoss,
                });
              })}>
                {tr(lang, "اگلا اوور", "Next over")}
              </button>
            ) : reward.made ? (
              <button type="button" className={primary} onClick={() => leave(() => {
                if (!takeEnergy()) {
                  setScreen("home");
                  setModal({ type: "energy" });
                  return;
                }
                begin({ mode: "quick", street: save.street, bowler: save.bowler, seed: newSeed() });
              })}>
                {tr(lang, "اگلا اوور", "Next over")}
              </button>
            ) : null}
            <button type="button" className={quiet} onClick={() => share(shareText(reward.code, reward.score, reward.street))}>
              <Share2 className="size-4" />
              {tr(lang, "واٹس ایپ کوڈ", "WhatsApp code")}
            </button>
            <button type="button" className={quiet} onClick={() => leave(() => setScreen("home"))}>
              {tr(lang, "گھر", "Home")}
            </button>
          </div>
        </section>
      ) : null}

      {screen === "shop" ? (
        <section className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-4 pb-6">
          <Back label={tr(lang, "واپس", "Back")} onClick={() => setScreen("home")} />
          <h2 className="copy mt-3 text-3xl">{tr(lang, "دکان", "Shop")}</h2>
          <p className="copy text-sm text-muted">{tr(lang, "کاسمیٹک۔ ٹاپ ۱۰۰ کو پیسے نہیں روکتے۔", "Cosmetics. Money does not gate the city top 100.")}</p>
          <button type="button" className={`${quiet} mt-3`} disabled={save.timingLevel >= 5 || save.coins < nextTimingCost(save.timingLevel)} onClick={() => {
            const cost = nextTimingCost(save.timingLevel);
            if (save.timingLevel >= 5 || save.coins < cost) return;
            patchSave({ coins: save.coins - cost, timingLevel: save.timingLevel + 1 });
          }}>
            {tr(lang, "ٹائمنگ ونڈو", "Timing window")} {save.timingLevel}/5
            {save.timingLevel < 5 ? ` · ${nextTimingCost(save.timingLevel)}` : ""}
          </button>
          <div className="mt-4 flex flex-col gap-2">
            {ITEMS.map((item) => {
              const owned = save.owned.includes(item.id);
              const equipped = save.bat === item.id || save.board === item.id || save.cele === item.id;
              const price = item.costTokens ? `${item.costTokens} ${tr(lang, "ٹوکن", "tokens")}` : item.costCoins ? `${item.costCoins}` : tr(lang, "انعام", "Reward");
              return (
                <button key={item.id} type="button" className={`${quiet} justify-between`} onClick={() => buyItem(item)}>
                  <span className="flex items-center gap-2">
                    <span className="size-4 rounded-full border border-line" style={{ background: item.tape }} />
                    {tx(lang, item.name)}
                  </span>
                  <span className="score text-xl text-amber">{equipped ? tr(lang, "لگا ہے", "On") : owned ? tr(lang, "لگاؤ", "Equip") : price}</span>
                </button>
              );
            })}
          </div>
          <h3 className="copy mt-6 text-xl">{tr(lang, "روپے پریویو", "Rupee preview")}</h3>
          <p className="copy text-sm text-muted">{tr(lang, "پلے بلنگ کا نمونہ۔ یہاں چارج نہیں ہوتا۔", "A Play Billing preview. Nothing is charged here.")}</p>
          <div className="mt-2 flex flex-col gap-2">
            <Pack lang={lang} id="starter" title={tr(lang, "ستارٹر ٹیپ", "Starter tape")} price="Rs 50" detail={tr(lang, "۷ دن بغیر انٹرسٹیشل + سمندر ٹیپ", "7 days without interstitials + sea tape")} onPick={(id) => setModal({ type: "iap", id })} />
            <Pack lang={lang} id="c100" title={tr(lang, "سکوں کی تھیلی", "Coin pouch")} price="Rs 100" detail="400" onPick={(id) => setModal({ type: "iap", id })} />
            <Pack lang={lang} id="c250" title={tr(lang, "سکوں کی تھیلی", "Coin pouch")} price="Rs 250" detail="1200" onPick={(id) => setModal({ type: "iap", id })} />
            <Pack lang={lang} id="c500" title={tr(lang, "سکوں کی تھیلی", "Coin pouch")} price="Rs 500" detail="2800" onPick={(id) => setModal({ type: "iap", id })} />
            <Pack lang={lang} id="pass" title={tr(lang, "اسٹریٹ پاس", "Street pass")} price="Rs 149" detail={tr(lang, "کاسمیٹک ٹریک۔ کچھ لازمی نہیں۔", "Cosmetic track. Nothing required is skipped.")} onPick={(id) => setModal({ type: "iap", id })} />
          </div>
        </section>
      ) : null}

      {screen === "ladder" ? (
        <section className="flex min-h-0 flex-1 flex-col px-4 pt-4 pb-5">
          <Back label={tr(lang, "واپس", "Back")} onClick={() => setScreen("home")} />
          <h2 className="copy mt-3 text-3xl">{tr(lang, "شہری سیڑھی", "City ladder")}</h2>
          <p className="copy text-sm text-muted">{tr(lang, "پیر ۰۰:۰۰ PKT پر ری سیٹ۔ یہ ہفتے کے سائے ہیں۔", "Resets Monday 00:00 PKT. These are this week's shadows.")}</p>
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {CITIES.map((city) => (
              <button key={city.id} type="button" className={`${quiet} ${ladderCity === city.id ? "border-amber" : ""}`} onClick={() => setLadderCity(city.id)}>
                {tx(lang, city.name)}
              </button>
            ))}
          </div>
          <ol className="mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
            {ladderRows(ladderCity, save.week || weekKey(), save.bestByCity[ladderCity] ?? 0, { ur: "تم", en: "You" }).map((row, i) => (
              <li key={`${row.name.en}-${i}`} className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${row.you ? "border-amber bg-panel-2" : "border-line bg-panel"}`}>
                <span className="copy">{i + 1}. {tx(lang, row.name)}</span>
                <span className="score text-2xl">{row.score}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {screen === "challenge" ? (
        <section className="flex min-h-0 flex-1 flex-col px-4 pt-4 pb-5">
          <Back label={tr(lang, "واپس", "Back")} onClick={() => setScreen("home")} />
          <h2 className="copy mt-3 text-3xl">{tr(lang, "دوست چیلنج", "Friend challenge")}</h2>
          <p className="copy text-muted">{tr(lang, "ایک ہی گیندیں۔ جیت پر کریٹ۔ پیسے نہیں۔", "Same balls. A crate if you pass them. No cash.")}</p>
          <label className="copy mt-4 text-sm text-muted" htmlFor="gxi-code">{tr(lang, "کوڈ", "Code")}</label>
          <input
            id="gxi-code"
            dir="ltr"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
            placeholder="GXI-KHI-…"
            className="score mt-1 min-h-12 rounded-2xl border border-line bg-dusk-2 px-4 text-2xl text-cream outline-none"
          />
          <button
            type="button"
            className={`${primary} mt-3`}
            onClick={() => {
              const decoded = decodeChallenge(codeInput);
              if (!decoded) {
                say("کوڈ غلط ہے۔", "That code doesn't read.");
                return;
              }
              if (!save.streets.includes(decoded.street)) {
                say("پہلے یہ گلی کھولو۔", "Unlock that street first.");
                return;
              }
              if (!takeEnergy()) {
                setModal({ type: "energy" });
                return;
              }
              begin({ mode: "challenge", street: decoded.street, bowler: "tape", seed: decoded.seed, ghost: decoded.score, code: codeInput.trim().toUpperCase() });
            }}
          >
            {tr(lang, "یہ کوڈ کھیلو", "Play this code")}
          </button>
          <p className="copy mt-4 text-sm text-muted">{tr(lang, "اپنا کوڈ اوور کے بعد شیئر ہوتا ہے۔", "Your code appears after an over.")}</p>
        </section>
      ) : null}

      {screen === "season" ? (
        <section className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-4 pb-6">
          <Back label={tr(lang, "واپس", "Back")} onClick={() => setScreen("home")} />
          <h2 className="copy mt-3 text-3xl">{tr(lang, "اسٹریٹ لیگ", "Street league")}</h2>
          <p className="copy text-sm text-muted">
            {save.seasonXp} XP {save.seasonPrem ? `· ${tr(lang, "پاس آن", "Pass on")}` : `· ${tr(lang, "مفت ٹریک", "Free track")}`}
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-panel">
            <div className="h-full bg-amber" style={{ width: `${Math.min(100, (save.seasonXp / 220) * 100)}%` }} />
          </div>
          <ol className="mt-4 flex flex-col gap-2">
            {SEASON_TIERS.map((tier, index) => {
              const open = save.seasonXp >= tier.xp;
              const freeDone = save.seasonFree.includes(index);
              const premDone = save.seasonPremClaimed.includes(index);
              return (
                <li key={tier.xp} className="rounded-2xl border border-line bg-panel p-3">
                  <p className="copy">{tier.xp} XP</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button type="button" className={quiet} disabled={!open || freeDone} onClick={() => claimTier(index, false)}>
                      {freeDone ? <Check className="size-4" /> : null}
                      {tr(lang, "مفت", "Free")} {tier.freeTokens ? tr(lang, "ٹوکن", "token") : tier.freeCoins}
                    </button>
                    <button type="button" className={quiet} disabled={!open || !save.seasonPrem || premDone} onClick={() => claimTier(index, true)}>
                      {premDone ? <Check className="size-4" /> : null}
                      {tr(lang, "پاس", "Pass")}
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}

      {screen === "settings" ? (
        <section className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-4 pb-6">
          <Back label={tr(lang, "واپس", "Back")} onClick={() => setScreen("home")} />
          <h2 className="copy mt-3 text-3xl">{tr(lang, "ترتیبات", "Settings")}</h2>
          <div className="mt-4 flex flex-col gap-2">
            <button type="button" className={quiet} onClick={() => { const sound = !save.sound; patchSave({ sound }); setMuted(!sound); if (sound) startBed(); }}>
              {save.sound ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
              {tr(lang, "آواز", "Sound")}
            </button>
            <button type="button" className={quiet} onClick={() => patchSave({ shake: !save.shake })}>
              {tr(lang, "ہلچل", "Screen shake")} {save.shake ? tr(lang, "آن", "on") : tr(lang, "آف", "off")}
            </button>
            <button type="button" className={quiet} onClick={() => patchSave({ look: save.look === "short" ? "tied" : "short" })}>
              {tr(lang, "بیٹر", "Batter")} {save.look === "tied" ? tr(lang, "بال باندھے", "Hair tied") : tr(lang, "چھوٹے بال", "Short hair")}
            </button>
          </div>
          <p className="copy mt-4 text-sm text-muted">{tr(lang, "تمہارا شہر", "Your city")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {CITIES.map((city) => (
              <button key={city.id} type="button" className={`${quiet} ${save.homeCity === city.id ? "border-amber" : ""}`} onClick={() => patchSave({ homeCity: city.id })}>
                <MapPin className="size-4" />
                {tx(lang, city.name)}
              </button>
            ))}
          </div>
          <p className="copy mt-4 text-sm text-muted">
            {tr(lang, "اوور", "Overs")} {save.oversFinished} · {tr(lang, "پوائنٹ", "Points")} {save.rankPoints} · {tr(lang, "اشتہار", "Ads")} {save.adRewards}
          </p>
          <p className="copy mt-4 text-sm">
            {tr(
              lang,
              "یہ جوا نہیں۔ روپے نہیں نکلتے۔ داؤ نہیں۔ اشتہار اور قیمتیں پلے اسٹور ورژن کا نمونہ ہیں۔",
              "Not gambling. No cash-out. No betting. Ads and prices preview the Play Store build.",
            )}
          </p>
          <button type="button" className={`${quiet} mt-4 text-wicket`} onClick={() => setModal({ type: "reset" })}>
            {tr(lang, "سیو مٹاؤ", "Erase save")}
          </button>
        </section>
      ) : null}

      {notice ? <p className="copy pointer-events-none absolute inset-x-4 top-4 z-30 rounded-2xl border border-line bg-panel px-4 py-3 text-center">{notice}</p> : null}

      {modal?.type === "energy" ? (
        <Sheet title={tr(lang, "اوور ختم", "No overs left")} onClose={() => setModal(null)}>
          <p className="copy text-muted">{tr(lang, `ایک اوور ${clock(wait)} میں۔ یا اشتہار۔`, `One over in ${clock(wait)}. Or a sponsor card.`)}</p>
          <button type="button" className={`${primary} mt-3`} onClick={() => openAd("energy", () => {
            const s = getSave();
            const at = Date.now();
            const regenNow = applyRegen(s.energy, s.energyAt || at, at);
            patchSave({ energy: Math.min(ENERGY_CAP, regenNow.energy + 1), energyAt: regenNow.energy + 1 >= ENERGY_CAP ? at : regenNow.energyAt });
          })}>
            {tr(lang, "اشتہار — ایک اوور", "Sponsor card — one over")} ({adsRemaining()})
          </button>
        </Sheet>
      ) : null}

      {modal?.type === "ad" ? (
        <Sheet title={tr(lang, "اسپانسر کارڈ", "Sponsor card")}>
          <p className="copy">{tr(lang, "چائے سٹال — یہ اشتہار کا نمونہ ہے۔", "Chai stall — this is a sample placement, not a live ad.")}</p>
          <AdWait label={tr(lang, "انعام لو", "Collect")} onDone={finishAd} />
        </Sheet>
      ) : null}

      {modal?.type === "interstitial" ? (
        <Sheet title={tr(lang, "اسٹریٹ بورڈ", "Street board")}>
          <p className="copy">{tr(lang, "چائے سٹال۔ صرف کامیاب اوور کے بعد، پہلی نشست میں نہیں۔", "Chai stall. Only after a successful over, never in the first session.")}</p>
          <AdWait seconds={2} armAt={1} label={tr(lang, "آگے", "Continue")} onDone={() => {
            const then = afterRef.current;
            afterRef.current = null;
            setModal(null);
            then?.();
          }} />
        </Sheet>
      ) : null}

      {modal?.type === "iap" ? (
        <Sheet title={tr(lang, "پریویو خرید", "Preview purchase")} onClose={() => setModal(null)}>
          <p className="copy">{tr(lang, "گوگل پلے بلنگ کا نمونہ، روپے میں۔ اس ڈیمو میں کارت سے پیسے نہیں کٹتے۔", "A Google Play Billing sample in PKR. This demo does not charge a card.")}</p>
          <button type="button" className={`${primary} mt-3`} onClick={() => grantPack(modal.id)}>
            {tr(lang, "انلاک کرو", "Unlock preview")}
          </button>
        </Sheet>
      ) : null}

      {modal?.type === "odds" ? (
        <Sheet title={tr(lang, "کریٹ کے امکانات", "Crate odds")} onClose={() => setModal(null)}>
          <ul className="copy flex flex-col gap-1 text-sm">
            {CRATE_ODDS.map((row) => (
              <li key={row.id}>{lang === "ur" ? row.ur : row.en}</li>
            ))}
          </ul>
          <button type="button" className={`${primary} mt-3`} onClick={claimDaily}>
            {tr(lang, "کھولو", "Open")}
          </button>
        </Sheet>
      ) : null}

      {modal?.type === "gift" ? (
        <Sheet title={tr(lang, "نایاب ٹیپ", "Rare tape")} onClose={() => setModal(null)}>
          <p className="copy">{tr(lang, "پانچ اوور پورے ہوئے۔ سمندر ٹیپ تمہاری ہے۔", "Five overs done. The sea tape is yours.")}</p>
          <button type="button" className={`${primary} mt-3`} onClick={() => { patchSave({ bat: "bat-sea" }); setModal(null); }}>
            {tr(lang, "لگاؤ", "Equip")}
          </button>
        </Sheet>
      ) : null}

      {modal?.type === "forfeit" ? (
        <Sheet title={tr(lang, "اوور چھوڑیں؟", "Leave this over?")} onClose={() => setModal(null)}>
          <p className="copy">{tr(lang, "سکے نہیں ملیں گے۔", "You won't get the coins.")}</p>
          <button type="button" className={`${primary} mt-3`} onClick={() => { setModal(null); setLive(null); setScreen("home"); }}>
            {tr(lang, "چھوڑیں", "Leave")}
          </button>
        </Sheet>
      ) : null}

      {modal?.type === "reset" ? (
        <Sheet title={tr(lang, "سب مٹا دیں؟", "Erase everything?")} onClose={() => setModal(null)}>
          <button type="button" className={`${primary} bg-wicket text-cream`} onClick={() => { resetSave(); setModal(null); setScreen("home"); setReward(null); setLive(null); }}>
            {tr(lang, "مٹاؤ", "Erase")}
          </button>
        </Sheet>
      ) : null}
    </main>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return <span className="score inline-flex min-h-12 items-center gap-1 rounded-full border border-line bg-panel px-3 text-xl">{children}</span>;
}

function Back({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="copy inline-flex min-h-12 items-center gap-1 text-muted" onClick={onClick}>
      <ChevronLeft className="size-5 rtl:rotate-180" />
      {label}
    </button>
  );
}

function Sheet({ title, children, onClose }: { title: string; children: ReactNode; onClose?: () => void }) {
  return (
    <div className="absolute inset-0 z-20 flex items-end bg-dusk/80 p-4">
      <div className="w-full rounded-2xl border border-line bg-panel p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="copy text-2xl">{title}</h2>
          {onClose ? (
            <button type="button" className="flex size-12 items-center justify-center rounded-full border border-line" onClick={onClose} aria-label="Close">
              <X className="size-5" />
            </button>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );
}

function AdWait({ label, onDone, seconds = 3, armAt = 0 }: { label: string; onDone: () => void; seconds?: number; armAt?: number }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    const id = window.setInterval(() => setLeft((n) => (n <= 0 ? 0 : n - 1)), 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <button type="button" className={`${primary} mt-3`} disabled={left > armAt} onClick={onDone}>
      {left > armAt ? String(left) : label}
    </button>
  );
}

function Pack({ lang, id, title, price, detail, onPick }: { lang: Save["lang"]; id: string; title: string; price: string; detail: string; onPick: (id: string) => void }) {
  return (
    <button type="button" className={`${quiet} justify-between`} onClick={() => onPick(id)}>
      <span className="text-start">
        <span className="block">{title}</span>
        <span className="block text-sm text-muted">{detail}</span>
      </span>
      <span className="score text-2xl text-amber">{price}</span>
    </button>
  );
}

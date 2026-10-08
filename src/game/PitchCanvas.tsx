import { useEffect, useRef } from "react";
import type { BallPlan, CityId, Look, Script, ShotKind } from "./content";
import { playCheer, playOut, playTap, playThwack } from "./audio";
import { drawScene, emit, makePool, type Scene } from "./draw";
import { judge, type DeliveryResult } from "./sim";

type Props = {
  city: CityId;
  plan: BallPlan;
  windowSec: number;
  script: Script;
  look: Look;
  tape: string;
  board: string;
  cele: string;
  arm: ShotKind;
  reduced: boolean;
  shakeOn: boolean;
  mercy: boolean;
  onDone: (result: DeliveryResult) => void;
};

export function PitchCanvas({
  city,
  plan,
  windowSec,
  script,
  look,
  tape,
  board,
  cele,
  arm,
  reduced,
  shakeOn,
  mercy,
  onDone,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const onDoneRef = useRef(onDone);
  const armRef = useRef(arm);
  onDoneRef.current = onDone;
  armRef.current = arm;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pool = makePool();
    const scene: Scene = {
      w: 1,
      h: 1,
      t: 0,
      city,
      p: -1,
      line: plan.line,
      showBall: false,
      ring: false,
      ringHot: false,
      swing: 0,
      look,
      tape,
      board,
      flash: 0,
      shake: 0,
      callout: "",
      calloutLife: 0,
      particles: pool,
      reduced,
      stumps: 0,
      runup: 0,
      cele,
    };

    let phase: "runup" | "flight" | "freeze" | "hitstop" | "show" = "runup";
    let phaseT = 0;
    let flightT = 0;
    let freezeT = 0;
    let swung = false;
    let swingAt: number | null = null;
    let swingKind: ShotKind = "ground";
    let swingT = -1;
    let result: DeliveryResult | null = null;
    let fired = false;
    let down = false;
    let downY = 0;
    let downAt = 0;
    let last = performance.now();
    let raf = 0;

    const fit = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      const w = Math.max(1, Math.floor(rect.width * dpr));
      const h = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      scene.w = w;
      scene.h = h;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);

    const colorFor = () => {
      if (cele === "cele-bhangra") return "#e24b3b";
      if (cele === "cele-roar") return "#f4ead7";
      return "#f0a202";
    };

    const resolve = () => {
      if (result) return;
      let judged = judge(plan, swingAt, swingKind, windowSec);
      if (mercy && judged.wicket) {
        judged = { runs: 0, wicket: false, quality: "dot", label: "dot", note: "dot" };
      }
      result = judged;
      scene.callout = result.label;
      scene.calloutLife = 1;
      if (result.wicket) {
        scene.stumps = 1;
        playOut();
        if (shakeOn) scene.shake = Math.min(1, scene.shake + 0.7);
      } else if (result.runs >= 4) {
        playThwack();
        playCheer();
        scene.flash = 1;
        if (shakeOn) scene.shake = Math.min(1, scene.shake + (result.runs === 6 ? 0.85 : 0.5));
        emit(pool, scene.w * 0.55, scene.h * 0.62, colorFor(), result.runs === 6 ? 18 : 10);
      } else if (result.runs > 0 || result.note === "blocked") {
        playThwack();
        if (shakeOn) scene.shake = Math.min(1, scene.shake + 0.25);
        emit(pool, scene.w * 0.55, scene.h * 0.66, "#f4ead7", 6);
      } else {
        playTap();
      }
      phase = result.runs >= 4 && !reduced ? "hitstop" : "show";
      phaseT = 0;
    };

    const doSwing = (kind: ShotKind, at: number) => {
      if (swung) return;
      swung = true;
      swingAt = at;
      swingKind = kind;
      swingT = 0;
      if (phase === "freeze") phase = "flight";
    };

    const tick = (dt: number) => {
      scene.t += dt;
      scene.flash = Math.max(0, scene.flash - dt * 3.2);
      scene.shake = Math.max(0, scene.shake - dt * 1.5);
      scene.calloutLife = Math.max(0, scene.calloutLife - dt * 0.7);
      if (scene.stumps > 0 && scene.stumps < 1.4) scene.stumps += dt * 1.6;
      if (swingT >= 0 && swingT < 1) {
        swingT = Math.min(1, swingT + dt / 0.18);
        const e = 1 - Math.pow(1 - swingT, 3);
        scene.swing = e;
      }
      for (const p of pool) {
        if (p.life <= 0) continue;
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 280 * dt;
      }
      if (phase === "runup") {
        phaseT += dt;
        scene.runup = phaseT;
        scene.p = -1;
        scene.showBall = false;
        scene.ring = false;
        if (phaseT >= 0.46) {
          phase = "flight";
          phaseT = 0;
          flightT = 0;
          scene.showBall = true;
          scene.ring = true;
        }
      } else if (phase === "freeze") {
        freezeT += dt;
        scene.p = flightT / plan.arrive;
        scene.ring = true;
        scene.ringHot = true;
        scene.showBall = true;
        if (freezeT > 5 && !swung) {
          phase = "flight";
        }
      } else if (phase === "flight") {
        flightT += dt;
        scene.runup = 1;
        scene.p = flightT / plan.arrive;
        scene.showBall = true;
        scene.ring = true;
        const left = plan.arrive - flightT;
        scene.ringHot = left <= windowSec && left >= -windowSec * 0.55;
        if (script === "freeze-green" && !swung && scene.ringHot) {
          phase = "freeze";
          freezeT = 0;
          flightT = plan.arrive - windowSec * 0.35;
          scene.p = flightT / plan.arrive;
        }
        if (script === "auto-six" && !swung && flightT >= plan.arrive - 0.02) {
          doSwing("loft", plan.arrive);
        }
        if (!swung && flightT > plan.arrive + windowSec * 3.5) {
          swung = true;
          swingAt = null;
        }
        if (swung && flightT >= Math.max(swingAt ?? 0, plan.arrive) + 0.04) resolve();
      } else if (phase === "hitstop") {
        phaseT += dt;
        if (phaseT > 0.07) {
          phase = "show";
          phaseT = 0;
        }
      } else if (phase === "show") {
        phaseT += dt;
        scene.ring = false;
        if (phaseT > 0.78 && result && !fired) {
          fired = true;
          onDoneRef.current(result);
        }
      }
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      let acc = dt;
      const stepDt = 1 / 120;
      while (acc > 0) {
        const d = Math.min(stepDt, acc);
        tick(d);
        acc -= d;
      }
      drawScene(ctx, scene);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const kindFrom = (dy: number, held: number): ShotKind => {
      if (dy < -28) return "loft";
      if (dy > 28) return "defend";
      if (held > 0.18) return "loft";
      return armRef.current;
    };

    const up = (clientY: number) => {
      if (!down) return;
      down = false;
      if (swung) return;
      if (phase !== "flight" && phase !== "freeze") return;
      const held = (performance.now() - downAt) / 1000;
      doSwing(kindFrom(clientY - downY, held), flightT);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (phase !== "flight" && phase !== "freeze") return;
      down = true;
      downY = e.clientY;
      downAt = performance.now();
      canvas.setPointerCapture(e.pointerId);
    };
    const onPointerUp = (e: PointerEvent) => up(e.clientY);
    const onPointerCancel = () => {
      down = false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code !== "Space" && e.code !== "ArrowUp" && e.code !== "ArrowDown") return;
      if (phase !== "flight" && phase !== "freeze") return;
      e.preventDefault();
      const kind: ShotKind = e.code === "ArrowUp" ? "loft" : e.code === "ArrowDown" ? "defend" : armRef.current;
      doSwing(kind, flightT);
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerCancel);
    window.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerCancel);
      window.removeEventListener("keydown", onKey);
    };
  }, [board, cele, city, look, mercy, plan, reduced, script, shakeOn, tape, windowSec]);

  return <canvas ref={ref} data-testid="pitch" className="pitch" />;
}

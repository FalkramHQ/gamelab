import { useMemo, useState } from "react";
import { CREATURES, QuestionCard, Trait, questionText } from "../game/data";
import { Action, Game } from "../game/engine";
import { seatName, TRAIT_VALUES_UI } from "./bits";

export function Overlay(props: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <div className="overlay" onClick={props.onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {props.children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ reference */

export function ReferenceModal(props: { onClose: () => void }) {
  return (
    <Overlay onClose={props.onClose}>
      <button className="close-x" onClick={props.onClose}>✕</button>
      <div className="refcard">
        <h2 style={{ marginTop: 0 }}>SPOTTED! — Reference Card</h2>
        <h4>YOUR TURN</h4>
        <ul>
          <li><span className="t">Draw</span> 1 card (hand limit 7).</li>
          <li>Then <span className="t">one</span> action: <b>Ask</b> · <b>Special</b> · <b>Identify</b> · <b>Discard</b>.</li>
        </ul>
        <h4>ACTIONS</h4>
        <ul>
          <li><span className="t">Ask:</span> play a question card at any rival → honest public YES/NO. Card discarded.</li>
          <li><span className="t">Special:</span> play it, resolve it, discard it.</li>
          <li><span className="t">Identify:</span> name a rival's creature. No card needed!</li>
          <li><span className="t">Discard:</span> toss any 1 card.</li>
        </ul>
        <h4>SPECIALS</h4>
        <ul>
          <li><span className="t">Double Probe</span> — ask up to 2 questions (public).</li>
          <li><span className="t">Misdirect</span> — 1 question, answer SECRET to you.</li>
          <li><span className="t">Eavesdrop</span> — secretly see a rival's one trait value.</li>
          <li><span className="t">Cross-Examine</span> — same question to 2 targets (public).</li>
          <li><span className="t">Wild Probe</span> — any trait question, no card needed (public).</li>
        </ul>
        <h4>SCORING</h4>
        <ul>
          <li>Correct ID: <span className="t">2 + bonus</span>, bonus = max(0, 4 − q), q = public answers heard about that specimen. Max 6.</li>
          <li>Wrong ID: <span className="t">−3 tokens</span> (min 0); the guess becomes public info.</li>
          <li>First to <span className="t">10</span> triggers the final round (duel: 8). Highest total wins.</li>
          <li>Tiebreak: most correct IDs, then seat order.</li>
        </ul>
        <h4>REMEMBER</h4>
        <ul>
          <li>Every public answer helps EVERYONE — including whoever is hunting you.</li>
          <li>Guess early = big bonus but risky. Your wrong guess is public forever.</li>
        </ul>
      </div>
    </Overlay>
  );
}

/* ------------------------------------------------------------ identify */

export function IdentifyModal(props: {
  game: Game;
  onCommit: (actions: Action[]) => void;
  onClose: () => void;
}) {
  const [target, setTarget] = useState<number | null>(null);
  const [cid, setCid] = useState<string | null>(null);
  const dead = useMemo(() => {
    const s = new Set<string>();
    for (const ev of props.game.log) if (ev.kind === "identified") s.add(ev.cid);
    return s;
  }, [props.game]);

  return (
    <Overlay onClose={props.onClose}>
      <button className="close-x" onClick={props.onClose}>✕</button>
      <h2>SPOTTED! — Make an Identification</h2>
      <div className="row">
        <span>Whose specimen?</span>
        {props.game.players.filter((p) => p.seat !== 0).map((p) => (
          <button key={p.seat} className={target === p.seat ? "gold" : ""}
                  onClick={() => setTarget(p.seat)}>
            {seatName(p.seat)}
          </button>
        ))}
      </div>
      <div className="creature-grid">
        {CREATURES.map((c) => (
          <div key={c.cid}
               className={`creature-tile${cid === c.cid ? " sel" : ""}${dead.has(c.cid) ? " dead" : ""}`}
               onClick={() => setCid(c.cid)}>
            <img src={`/creatures/${c.cid}.jpg`} alt={c.name} />
            <div className="cname">{c.name}</div>
          </div>
        ))}
      </div>
      <div className="row" style={{ justifyContent: "flex-end" }}>
        <span style={{ color: "var(--muted)", fontSize: 13 }}>
          Correct: 2 + efficiency bonus · Wrong: −3 & public
        </span>
        <button className="gold" disabled={target === null || !cid}
                onClick={() => props.onCommit([{ kind: "guess", target: target!, cid: cid! }])}>
          Shout SPOTTED!
        </button>
      </div>
    </Overlay>
  );
}

/* ------------------------------------------------------------ specials */

function QuestionBuilder(props: {
  label: string;
  target: number | null;
  setTarget: (t: number) => void;
  trait: Trait;
  setTrait: (t: Trait) => void;
  value: string;
  setValue: (v: string) => void;
  rivals: number[];
}) {
  return (
    <div className="row">
      <b style={{ width: 90 }}>{props.label}</b>
      <select value={props.trait} onChange={(e) => {
        const t = e.target.value as Trait;
        props.setTrait(t);
        props.setValue(TRAIT_VALUES_UI[t][0]);
      }}>
        {(Object.keys(TRAIT_VALUES_UI) as Trait[]).map((t) => <option key={t}>{t}</option>)}
      </select>
      <select value={props.value} onChange={(e) => props.setValue(e.target.value)}>
        {TRAIT_VALUES_UI[props.trait].map((v) => <option key={v}>{v}</option>)}
      </select>
      <select value={props.target ?? ""} onChange={(e) => props.setTarget(Number(e.target.value))}>
        <option value="" disabled>target…</option>
        {props.rivals.map((r) => <option key={r} value={r}>{seatName(r)}</option>)}
      </select>
      <span style={{ fontSize: 12, color: "var(--muted)" }}>
        “{questionText(props.trait, props.value)}”
      </span>
    </div>
  );
}

export function SpecialDialog(props: {
  card: QuestionCard;
  game: Game;
  onCommit: (actions: Action[]) => void;
  onClose: () => void;
}) {
  const rivals = props.game.players.filter((p) => p.seat !== 0).map((p) => p.seat);
  const [t1, setT1] = useState<number | null>(null);
  const [t2, setT2] = useState<number | null>(null);
  const [tr1, setTr1] = useState<Trait>("class");
  const [v1, setV1] = useState(TRAIT_VALUES_UI.class[0]);
  const [tr2, setTr2] = useState<Trait>("size");
  const [v2, setV2] = useState(TRAIT_VALUES_UI.size[0]);
  const [useSecond, setUseSecond] = useState(true);
  const kind = props.card.kind;

  const build = (): Action[] | null => {
    const acts: Action[] = [{ kind: "play_special", card: props.card }];
    if (kind === "double_probe") {
      if (t1 === null) return null;
      acts.push({ kind: "ask_free", trait: tr1, value: v1, target: t1, privateTo: null });
      if (useSecond && t2 !== null) {
        acts.push({ kind: "ask_free", trait: tr2, value: v2, target: t2, privateTo: null });
      }
    } else if (kind === "misdirect") {
      if (t1 === null) return null;
      acts.push({ kind: "ask_free", trait: tr1, value: v1, target: t1, privateTo: 0 });
    } else if (kind === "wild_probe") {
      if (t1 === null) return null;
      acts.push({ kind: "ask_free", trait: tr1, value: v1, target: t1, privateTo: null });
    } else if (kind === "eavesdrop") {
      if (t1 === null) return null;
      acts.push({ kind: "reveal_trait", trait: tr1, target: t1, privateTo: 0 });
    } else if (kind === "cross_examine") {
      if (t1 === null || t2 === null || t1 === t2) return null;
      acts.push({ kind: "ask_free", trait: tr1, value: v1, target: t1, privateTo: null });
      acts.push({ kind: "ask_free", trait: tr1, value: v1, target: t2, privateTo: null });
    }
    return acts;
  };

  return (
    <Overlay onClose={props.onClose}>
      <button className="close-x" onClick={props.onClose}>✕</button>
      <h2>{props.card.name}</h2>
      <p style={{ color: "var(--muted)", fontSize: 14 }}>{props.card.rule}</p>

      {(kind === "double_probe" || kind === "misdirect" || kind === "wild_probe") && (
        <QuestionBuilder label="Question" target={t1} setTarget={setT1}
                         trait={tr1} setTrait={setTr1} value={v1} setValue={setV1} rivals={rivals} />
      )}
      {kind === "double_probe" && (
        <>
          <div className="row">
            <label style={{ color: "var(--paper)" }}>
              <input type="checkbox" checked={useSecond} onChange={(e) => setUseSecond(e.target.checked)} />
              ask a second question
            </label>
          </div>
          {useSecond && (
            <QuestionBuilder label="Question 2" target={t2} setTarget={setT2}
                             trait={tr2} setTrait={setTr2} value={v2} setValue={setV2} rivals={rivals} />
          )}
        </>
      )}
      {kind === "eavesdrop" && (
        <div className="row">
          <b style={{ width: 90 }}>Peek at</b>
          <select value={t1 ?? ""} onChange={(e) => setT1(Number(e.target.value))}>
            <option value="" disabled>target…</option>
            {rivals.map((r) => <option key={r} value={r}>{seatName(r)}</option>)}
          </select>
          <select value={tr1} onChange={(e) => setTr1(e.target.value as Trait)}>
            {(Object.keys(TRAIT_VALUES_UI) as Trait[]).map((t) => <option key={t}>{t}</option>)}
          </select>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>value shown secretly to you</span>
        </div>
      )}
      {kind === "cross_examine" && (
        <>
          <QuestionBuilder label="Same question" target={t1} setTarget={setT1}
                           trait={tr1} setTrait={setTr1} value={v1} setValue={setV1} rivals={rivals} />
          <div className="row">
            <b style={{ width: 90 }}>2nd target</b>
            <select value={t2 ?? ""} onChange={(e) => setT2(Number(e.target.value))}>
              <option value="" disabled>target…</option>
              {rivals.filter((r) => r !== t1).map((r) => <option key={r} value={r}>{seatName(r)}</option>)}
            </select>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>both answer publicly</span>
          </div>
        </>
      )}

      <div className="row" style={{ justifyContent: "flex-end" }}>
        <button onClick={props.onClose}>Cancel</button>
        <button className="gold" onClick={() => {
          const acts = build();
          if (acts) props.onCommit(acts);
        }}>
          Play {props.card.name}
        </button>
      </div>
    </Overlay>
  );
}

/* ------------------------------------------------------------ game over */

export function GameOverModal(props: { game: Game; onRematch: () => void; onSetup: () => void }) {
  const g = props.game;
  const rows = [...g.players].sort((a, b) =>
    b.score - a.score || b.correctIds - a.correctIds || a.seat - b.seat);
  return (
    <Overlay>
      <h2>Game over — {seatName(g.winner)} win{g.winner === 0 ? "" : "s"}!</h2>
      <div className="gameover-standings">
        {rows.map((p, i) => (
          <div key={p.seat} className={`rowline${p.seat === g.winner ? " winner" : ""}`}>
            <span>{i + 1}.</span>
            <b>{seatName(p.seat)}</b>
            <span>{p.score} tokens</span>
            <span style={{ color: "var(--muted)" }}>· {p.correctIds} correct ID{p.correctIds === 1 ? "" : "s"}</span>
          </div>
        ))}
      </div>
      <p style={{ color: "var(--muted)", fontSize: 13 }}>
        Tiebreak (if needed): most correct Identifications, then seat order.
        {g.capped ? " (turn cap reached)" : ""}
      </p>
      <div className="row" style={{ justifyContent: "flex-end" }}>
        <button onClick={props.onSetup}>Change setup</button>
        <button className="gold" onClick={props.onRematch}>Rematch</button>
      </div>
    </Overlay>
  );
}

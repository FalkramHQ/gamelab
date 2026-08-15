import { ReactNode, useEffect, useRef, useState } from "react";
import { Action, Agent, Game, LogEvent } from "../game/engine";
import { InfoGainAgent, RandomAgent } from "../game/agents";
import { makeRng } from "../game/rng";
import { QuestionCard, creatureById, questionText } from "../game/data";
import { CardBacks, CardView, seatName } from "./bits";
import { Pad, PadMarks } from "./Pad";
import { GameOverModal, IdentifyModal, ReferenceModal, SpecialDialog } from "./modals";
import { SetupConfig } from "./SetupScreen";

const DUMMY: Agent = { play: () => [] };

interface FeedItem { id: number; node: ReactNode; }
let nextFeedId = 1;

export function GameScreen(props: {
  cfg: SetupConfig;
  seed: number;
  onSetup: () => void;
  onRematch: () => void;
}) {
  const gameRef = useRef<Game | null>(null);
  if (!gameRef.current) {
    const g = new Game({ nPlayers: props.cfg.players, seed: props.seed, kidsMode: props.cfg.kids });
    g.agents = g.players.map((_p, i) =>
      i === 0 ? DUMMY : props.cfg.difficulty === "sharp"
        ? new InfoGainAgent(makeRng(props.seed + 1000 + i))
        : new RandomAgent(makeRng(props.seed + 2000 + i)));
    gameRef.current = g;
  }
  const g = gameRef.current;

  const [, setV] = useState(0);
  const bump = () => setV((v) => v + 1);
  const [phase, setPhase] = useState<"human" | "busy" | "over">("busy");
  const [aimCard, setAimCard] = useState<QuestionCard | null>(null);
  const [discardMode, setDiscardMode] = useState(false);
  const [specialCard, setSpecialCard] = useState<QuestionCard | null>(null);
  const [identifyOpen, setIdentifyOpen] = useState(false);
  const [padOpen, setPadOpen] = useState(true);
  const [refOpen, setRefOpen] = useState(false);
  const [padMarks, setPadMarks] = useState<PadMarks>({});
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [lastDrawn, setLastDrawn] = useState<QuestionCard | null>(null);
  const timers = useRef<number[]>([]);
  const feedBox = useRef<HTMLDivElement>(null);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const push = (node: ReactNode) =>
    setFeed((f) => [...f, { id: nextFeedId++, node }]);

  // ------------------------------------------------------------- feed text
  const pushFeed = (seat: number, actions: Action[], events: LogEvent[]) => {
    for (const a of actions) {
      if (a.kind === "play_special") push(<><span className="who">{seatName(seat)}</span> played <b>{a.card.name}</b></>);
      if (a.kind === "discard") push(<span className="dim">{seatName(seat)} discards a card</span>);
    }
    for (const ev of events) {
      if (ev.kind === "answer") {
        if (ev.privateTo === null) {
          push(<>
            <span className="who">{seatName(seat)}</span> → {seatName(ev.target)}: “{questionText(ev.trait, ev.value)}” →{" "}
            <span className={ev.yes ? "yes" : "no"}>{ev.yes ? "YES" : "NO"}</span>
          </>);
        } else if (ev.privateTo === 0) {
          push(<>
            <span className="secret">Secret:</span> {seatName(ev.target)} answers YOU: “{questionText(ev.trait, ev.value)}” →{" "}
            <span className={ev.yes ? "yes" : "no"}>{ev.yes ? "YES" : "NO"}</span>
          </>);
        } else {
          push(<span className="dim">{seatName(seat)} asked {seatName(ev.target)} a question — answer hidden</span>);
        }
      } else if (ev.kind === "reveal") {
        if (ev.privateTo === 0) {
          push(<><span className="secret">Eavesdrop:</span> {seatName(ev.target)}’s <b>{ev.trait}</b> = <b>{ev.value}</b> (secret)</>);
        } else {
          push(<span className="dim">{seatName(seat)} eavesdropped on {seatName(ev.target)}’s {ev.trait} (value secret)</span>);
        }
      } else if (ev.kind === "guess_fail") {
        push(<>
          <span className="who">{seatName(seat)}</span> guessed {seatName(ev.target)} = <b>{creatureById(ev.cid).name}</b> —{" "}
          <span className="no">WRONG</span>{g.kidsMode ? "" : " (−3)"} · <span className="dim">public: not {creatureById(ev.cid).name}</span>
        </>);
      } else {
        const pts = g.kidsMode ? 2 : 2 + Math.max(0, 4 - ev.q);
        push(<>
          <span className="spot">SPOTTED!</span> <span className="who">{seatName(seat)}</span> identified {seatName(ev.target)}:{" "}
          <b>{creatureById(ev.cid).name}</b> (+{pts})
        </>);
      }
    }
  };

  // ------------------------------------------------------------- turn loop
  const advance = () => {
    if (g.over) { setPhase("over"); bump(); return; }
    g.beginTurn();
    const seat = g.turnSeat;
    if (seat === 0) {
      setLastDrawn(g.lastDrawn);
      setPhase("human");
      bump();
    } else {
      setPhase("busy");
      bump();
      later(() => {
        const actions = g.agents[seat].play(g, seat);
        const events = g.resolve(actions);
        pushFeed(seat, actions, events);
        g.endTurn();
        bump();
        later(advance, 650);
      }, 1000);
    }
  };

  const clearModes = () => {
    setAimCard(null); setDiscardMode(false); setSpecialCard(null);
    setIdentifyOpen(false); setLastDrawn(null);
  };

  const humanCommit = (actions: Action[]) => {
    const events = g.resolve(actions);
    pushFeed(0, actions, events);
    g.endTurn();
    clearModes();
    setPhase("busy");
    bump();
    later(advance, 450);
  };

  useEffect(() => {
    push(<span className="dim">— New game: {props.cfg.players} players, {props.cfg.difficulty} bots{props.cfg.kids ? ", KIDS MODE" : ""}. First to {g.winTarget} tokens. —</span>);
    advance();
    return () => { timers.current.forEach(clearTimeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    feedBox.current?.scrollTo({ top: feedBox.current.scrollHeight });
  }, [feed.length]);

  // ------------------------------------------------------------- hand clicks
  const onHandClick = (card: QuestionCard) => {
    if (phase !== "human") return;
    if (discardMode) { humanCommit([{ kind: "discard", card }]); return; }
    if (card.special) { setSpecialCard(card); return; }
    setAimCard(card.cardId === aimCard?.cardId ? null : card);
  };

  const onSeatClick = (seat: number) => {
    if (phase !== "human" || !aimCard) return;
    humanCommit([{ kind: "ask_card", card: aimCard, target: seat }]);
  };

  const hint = phase === "over" ? "Game over"
    : phase === "busy" ? (g.turnSeat === 0 ? "…" : `${seatName(g.turnSeat)} is thinking…`)
    : discardMode ? "Click a card in your hand to discard it."
    : aimCard ? `Ask “${aimCard.question}” — click a rival to target.`
    : "Your turn: play a question at a rival, use a special, Identify, or discard.";

  const me = g.players[0];

  return (
    <div className="app">
      <div className="topbar">
        <h1 className="logo" style={{ fontSize: 22 }}>SPOTTED<span>!</span></h1>
        <span style={{ color: "var(--muted)", fontSize: 13 }}>
          {props.cfg.kids ? "Kids Mode" : g.n === 2 ? "Duel" : "Standard"} · first to {g.winTarget}
        </span>
        <div className="spacer" />
        <button onClick={() => setRefOpen(true)} title="Open the how-to-play reference card any time">? How to play</button>
        <button onClick={() => setPadOpen(!padOpen)}>{padOpen ? "Hide pad" : "Pad"}</button>
        <button onClick={props.onSetup}>New game</button>
      </div>

      <div className="table">
        <div className="seats">
          {g.players.filter((p) => p.seat !== 0).map((p) => (
            <div key={p.seat}
                 className={`seat${g.turnSeat === p.seat && !g.over ? " active" : ""}${aimCard ? " targetable" : ""}`}
                 onClick={() => onSeatClick(p.seat)}>
              <div className="name">{seatName(p.seat)}{g.order[0] === p.seat ? " 🥇" : ""}</div>
              <CardBacks count={p.hand.length} />
              <div className="stats">
                <span>🪙 <b>{p.score}</b></span>
                <span title="public answers heard">q <b>{p.q}</b></span>
              </div>
              {g.turnSeat === p.seat && phase === "busy" && <div className="thinking">thinking…</div>}
              {aimCard && <div className="thinking">click to ask</div>}
            </div>
          ))}
        </div>

        <div className="midrow">
          <div className="feedwrap">
            <div className="feed" ref={feedBox}>
              {feed.map((f) => <div className="line" key={f.id}>{f.node}</div>)}
            </div>
          </div>
          {padOpen && (
            <div className="sidewrap">
              <div className="youpanel">
                <img className="specimen" src={`/creatures/${me.specimen.cid}.jpg`} alt={me.specimen.name} />
                <div className="meta">
                  <b>{me.specimen.name}</b>
                  <span>“{me.specimen.nickname}” — your secret specimen</span>
                  <span>🪙 {me.score} / {g.winTarget} · your q: {me.q}</span>
                </div>
              </div>
              <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
                <Pad game={g} marks={padMarks} setMarks={setPadMarks} />
              </div>
            </div>
          )}
        </div>

        <div className="bottombar">
          <div className="hint">
            {hint}
            {phase === "human" && lastDrawn && (
              <span className="drawn"> · you drew: <b>{lastDrawn.special ? lastDrawn.name : lastDrawn.question}</b></span>
            )}
          </div>
          <div className="hand">
            {me.hand.map((c) => (
              <CardView key={c.cardId} card={c}
                        selected={aimCard?.cardId === c.cardId}
                        onClick={() => onHandClick(c)} />
            ))}
          </div>
          <div className="actions">
            <button className="gold" disabled={phase !== "human"}
                    onClick={() => setIdentifyOpen(true)}>
              SPOTTED! (identify)
            </button>
            <button className={discardMode ? "gold" : ""} disabled={phase !== "human"}
                    onClick={() => { setDiscardMode(!discardMode); setAimCard(null); }}>
              Discard a card
            </button>
          </div>
        </div>
      </div>

      {refOpen && <ReferenceModal onClose={() => setRefOpen(false)} />}
      {identifyOpen && phase === "human" && (
        <IdentifyModal game={g} onClose={() => setIdentifyOpen(false)} onCommit={humanCommit} />
      )}
      {specialCard && phase === "human" && (
        <SpecialDialog card={specialCard} game={g}
                       onClose={() => setSpecialCard(null)} onCommit={humanCommit} />
      )}
      {phase === "over" && (
        <GameOverModal game={g} onRematch={props.onRematch} onSetup={props.onSetup} />
      )}
    </div>
  );
}

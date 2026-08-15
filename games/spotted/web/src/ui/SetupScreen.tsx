import { useState } from "react";

export interface SetupConfig {
  players: number;
  difficulty: "sharp" | "casual";
  kids: boolean;
}

export function SetupScreen(props: {
  onStart: (cfg: SetupConfig) => void;
  onReference: () => void;
}) {
  const [players, setPlayers] = useState(3);
  const [difficulty, setDifficulty] = useState<"sharp" | "casual">("sharp");
  const [kids, setKids] = useState(false);

  return (
    <div className="setup">
      <h1 className="logo">SPOTTED<span>!</span></h1>
      <div className="tag">
        The deduction card game of exotic cuties — digital playtest edition.<br />
        Hide your specimen. Interrogate your rivals. Shout SPOTTED!
      </div>
      <div className="panel">
        <div>
          <label>PLAYERS (you + computer biologists)</label>
          <div className="optrow" style={{ marginTop: 6 }}>
            {[2, 3, 4, 5].map((n) => (
              <button key={n} className={players === n ? "on" : ""} onClick={() => setPlayers(n)}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label>BOT DIFFICULTY</label>
          <div className="optrow" style={{ marginTop: 6 }}>
            <button className={difficulty === "sharp" ? "on" : ""} onClick={() => setDifficulty("sharp")}>
              Sharp (decision-tree AI)
            </button>
            <button className={difficulty === "casual" ? "on" : ""} onClick={() => setDifficulty("casual")}>
              Casual (random)
            </button>
          </div>
        </div>
        <div>
          <label>MODE</label>
          <div className="optrow" style={{ marginTop: 6 }}>
            <button className={!kids ? "on" : ""} onClick={() => setKids(false)}>
              Standard (first to 10)
            </button>
            <button className={kids ? "on" : ""} onClick={() => setKids(true)}>
              Kids Mode (first to 6)
            </button>
          </div>
        </div>
        <button className="gold" style={{ padding: "12px", fontSize: 16 }}
                onClick={() => props.onStart({ players, difficulty, kids })}>
          Deal me in
        </button>
        <button onClick={props.onReference}>How to play (reference card)</button>
      </div>
    </div>
  );
}

import { useState } from "react";
import { GameScreen } from "./ui/GameScreen";
import { SetupScreen, SetupConfig } from "./ui/SetupScreen";
import { ReferenceModal } from "./ui/modals";
import "./styles.css";

export default function App() {
  const [cfg, setCfg] = useState<SetupConfig | null>(null);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [gameId, setGameId] = useState(1);
  const [refOpen, setRefOpen] = useState(false);

  return cfg === null ? (
    <>
      <SetupScreen
        onStart={(c) => { setCfg(c); setSeed(Math.floor(Math.random() * 1e9)); setGameId((i) => i + 1); }}
        onReference={() => setRefOpen(true)}
      />
      {refOpen && <ReferenceModal onClose={() => setRefOpen(false)} />}
    </>
  ) : (
    <GameScreen
      key={gameId}
      cfg={cfg}
      seed={seed}
      onSetup={() => setCfg(null)}
      onRematch={() => { setSeed(Math.floor(Math.random() * 1e9)); setGameId((i) => i + 1); }}
    />
  );
}

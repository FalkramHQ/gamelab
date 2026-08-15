import { TRAITS, Trait } from "../game/data";
import { Game } from "../game/engine";
import { seatName, TRAIT_VALUES_UI } from "./bits";

export type PadMarks = Record<number, Record<string, "no" | "yes">>;

/** Manual deduction pad — you mark public answers yourself, like pen & paper.
 *  Public facts (q counter, failed guesses, identified specimens) are shown
 *  automatically because everyone at the table hears them. */
export function Pad(props: {
  game: Game;
  marks: PadMarks;
  setMarks: (m: PadMarks) => void;
}) {
  const { game, marks, setMarks } = props;
  const rivals = game.players.filter((p) => p.seat !== 0).map((p) => p.seat);
  const [rival, setRival] = useRival(rivals);
  const m = marks[rival] ?? {};

  const cycle = (trait: Trait, value: string) => {
    const key = `${trait}:${value}`;
    const cur = m[key];
    const next = cur === undefined ? "no" : cur === "no" ? "yes" : undefined;
    const nm = { ...m };
    if (next === undefined) delete nm[key]; else nm[key] = next;
    setMarks({ ...marks, [rival]: nm });
  };

  const failed = game.log.filter((e) => e.kind === "guess_fail" && e.target === rival);
  const spotted = game.log.filter((e) => e.kind === "identified" && e.target === rival);

  return (
    <div className="pad">
      <h3>Deduction pad — rival: {seatName(rival)}</h3>
      <div className="rival-tabs">
        {rivals.map((r) => (
          <button key={r} className={r === rival ? "on" : ""} onClick={() => setRival(r)}>
            {seatName(r)}
          </button>
        ))}
      </div>
      <table>
        <tbody>
          {TRAITS.map((t) => (
            <tr key={t}>
              <th style={{ textTransform: "uppercase" }}>{t}</th>
              <td>
                {TRAIT_VALUES_UI[t].map((v) => {
                  const st = m[`${t}:${v}`];
                  return (
                    <span key={v} className={`cell${st ? ` ${st}` : ""}`}
                          onClick={() => cycle(t, v)} title="click: cross out → circle → clear">
                      {v}
                    </span>
                  );
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="pub">
        <div><b>Public answers heard (q):</b> {game.players[rival].q}</div>
        <div><b>Failed guesses vs {seatName(rival)}:</b>{" "}
          {failed.length === 0 ? "none" :
            failed.map((e) => (e as { cid: string }).cid).join(", ")}
        </div>
        {spotted.length > 0 && (
          <div><b>Already spotted:</b> {spotted.length}× (new specimen drawn)</div>
        )}
        <div style={{ marginTop: 6, color: "#777" }}>
          click a value: cross out (NO) → circle (YES) → clear
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
function useRival(rivals: number[]): [number, (r: number) => void] {
  const [r, setR] = useState(rivals[0]);
  return [rivals.includes(r) ? r : rivals[0], setR];
}

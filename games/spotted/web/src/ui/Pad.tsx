import { CREATURES, TRAITS, Trait } from "../game/data";
import { Game } from "../game/engine";
import { seatName, TRAIT_VALUES_UI } from "./bits";

export type PadMarks = Record<number, Record<string, "no" | "yes">>;

/** Manual deduction pad — you mark public answers yourself, like pen & paper.
 *  Includes a 25-creature checklist (scratch animals out per rival) plus the
 *  trait grid. Public facts (q counter, failed guesses, identified specimens)
 *  are shown automatically because everyone at the table hears them. */
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

  const toggleCreature = (cid: string) => {
    const key = `creature:${cid}`;
    const nm = { ...m };
    if (nm[key]) delete nm[key]; else nm[key] = "no";
    setMarks({ ...marks, [rival]: nm });
  };

  const failed = game.log.filter((e) => e.kind === "guess_fail" && e.target === rival);
  const failedCids = new Set(failed.map((e) => (e as { cid: string }).cid));
  const spotted = game.log.filter((e) => e.kind === "identified" && e.target === rival);

  // Animals that contradict your "crossed out" trait marks (a public NO
  // answer rules them out), whether or not you scratched them manually.
  const ruledOut = CREATURES.filter((c) =>
    TRAITS.some((t) => m[`${t}:${c.traits[t]}`] === "no"));
  const possible = CREATURES.length - ruledOut.length
    - CREATURES.filter((c) => m[`creature:${c.cid}`] && !ruledOut.includes(c)).length;

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
      <h3 style={{ marginTop: 10 }}>Creatures — tap to scratch out</h3>
      <div className="checklist">
        {CREATURES.map((c) => {
          const crossed = !!m[`creature:${c.cid}`] || failedCids.has(c.cid);
          const contradicts = ruledOut.includes(c);
          const locked = failedCids.has(c.cid); // public failed guess: everyone knows
          return (
            <div key={c.cid}
                 className={`tile${crossed ? " crossed" : ""}${contradicts && !crossed ? " dim" : ""}`}
                 onClick={locked ? undefined : () => toggleCreature(c.cid)}
                 title={locked ? "Failed guess heard at the table — cannot be this"
                   : `${c.name} — ${TRAITS.map((t) => c.traits[t]).join(" · ")}`}>
              <img src={`/creatures/${c.cid}.jpg`} alt={c.name} loading="lazy" />
              <span className="tname">{c.name}</span>
              <span className="ttraits">
                {TRAITS.map((t) => (
                  <i key={t} className={`trait-${t}`} title={`${t}: ${c.traits[t]}`}>
                    {c.traits[t].slice(0, 4)}
                  </i>
                ))}
              </span>
            </div>
          );
        })}
      </div>
      <div className="pub">
        <div><b>Public answers heard (q):</b> {game.players[rival].q}</div>
        <div><b>Failed guesses vs {seatName(rival)}:</b>{" "}
          {failed.length === 0 ? "none" :
            failed.map((e) => (e as { cid: string }).cid).join(", ")}
        </div>
        {spotted.length > 0 && (
          <div><b>Already spotted:</b> {spotted.length}× (new specimen drawn)</div>
        )}
        <div><b>Still possible from your trait marks:</b> {possible} of {CREATURES.length}</div>
        <div style={{ marginTop: 6, color: "#777" }}>
          click a trait: cross out (NO) → circle (YES) → clear · tiles grey out when your NO marks rule them out
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

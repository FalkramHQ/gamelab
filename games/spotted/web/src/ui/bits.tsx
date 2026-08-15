import { QuestionCard, Trait } from "../game/data";

export const SEAT_NAMES = ["You", "Ada", "Ben", "Cara", "Dev"];
export const seatName = (s: number) => SEAT_NAMES[s] ?? `P${s}`;

export function CardView(props: {
  card: QuestionCard;
  selected?: boolean;
  onClick?: () => void;
}) {
  const { card, selected, onClick } = props;
  return (
    <div className={`card${card.special ? " special" : ""}${selected ? " selected" : ""}`}
         onClick={onClick}>
      {card.special ? (
        <>
          <div className="sname">{card.name}</div>
          <div className="qtext">{card.rule}</div>
          <div className="corner" style={{ color: "#c9a22788" }}>SPECIAL</div>
        </>
      ) : (
        <>
          <div className={`traitband trait-${card.trait}`}>{card.trait}</div>
          <div className="qtext">{card.question}</div>
          <div className="corner">{card.value}</div>
        </>
      )}
    </div>
  );
}

export function CardBacks(props: { count: number }) {
  return (
    <div className="backs">
      {Array.from({ length: Math.min(props.count, 7) }).map((_, i) => (
        <div key={i} className="cardback-mini" />
      ))}
    </div>
  );
}

export const TRAIT_VALUES_UI: Record<Trait, string[]> = {
  class: ["mammal", "bird", "reptile", "amphibian", "aquatic"],
  habitat: ["water", "forest", "grassland", "desert", "underground"],
  size: ["small", "medium", "large"],
  diet: ["herbivore", "carnivore", "omnivore"],
  activity: ["diurnal", "nocturnal"],
};

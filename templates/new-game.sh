#!/bin/bash
# Scaffold a new game in the lab.
# Usage: ./templates/new-game.sh <game-name>
set -euo pipefail

NAME="${1:?usage: ./templates/new-game.sh <game-name>}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATE="$(date +%Y-%m-%d)"

if [ -e "$ROOT/games/$NAME" ]; then
  echo "games/$NAME already exists" >&2
  exit 1
fi

mkdir -p "$ROOT/games/$NAME/cards" "$ROOT/games/$NAME/sim"

cp "$ROOT/templates/SPEC_TEMPLATE.md" "$ROOT/docs/specs/$DATE-$NAME-design.md"

cat > "$ROOT/games/$NAME/README.md" <<EOF
# $NAME

> Status: concept — spec at \`docs/specs/$DATE-$NAME-design.md\`

TODO: one-paragraph pitch (players, play time, the one clever hook).

## Contents

| Path | What it is |
|---|---|
| RULES.md | Rulebook (write after spec approval) |
| cards/ | Card content CSVs (single source of truth for print + sim) |
| sim/ | Rules engine, bots, balance experiments |
EOF

cat > "$ROOT/games/$NAME/cards/creatures.csv" <<EOF
id,name,trait_a,trait_b
EOF

cat > "$ROOT/games/$NAME/sim/README.md" <<EOF
# $NAME — simulation kit

Model on \`games/taxon/sim/\`: taxon_data.py (CSV loaders + math), engine.py (rules),
agents.py (random + optimal bots), run.py (experiments → REPORT.md), test_*.py.
EOF

echo "Scaffolded games/$NAME and docs/specs/$DATE-$NAME-design.md"
echo "Next: fill in the spec, then follow .qoder/skills/tabletop-game-design/SKILL.md"

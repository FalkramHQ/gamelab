# SPOTTED! — Art Direction & Generation Prompts

Style anchor: **Arcane (League of Legends series) × Valorant key art.**
Painterly cel-shading, bold ink outlines, flat color fields with textured brush
grain, dramatic rim light, high-saturation palette, slightly oversized features
for kid appeal. No photorealism, no gradients-only minimalism.

## Creature card — FRONT (one per specimen, 25 total)

```
Stylized game card front in the style of Arcane and Valorant key art:
a [ANIMAL] in a dynamic three-quarter pose, cel-shaded painterly illustration,
bold dark ink outlines, flat saturated color fields with visible brush texture,
dramatic rim lighting from the upper left, rich background vignette of its
habitat ([HABITAT]) softly out of focus. The creature fills the top two-thirds.
Bottom third: a dark horizontal trait bar with five small flat-design icons in a
row (class silhouette, habitat glyph, size silhouette, diet symbol, sun/moon).
Creature name "[NAME]" in bold condensed display type on a plate above the trait
bar. Aspect ratio 2:3, vertical trading card, clean negative space for UI
overlays, consistent lighting across the whole deck.
```

Replace `[ANIMAL]`, `[HABITAT]`, `[NAME]` per specimen (see `../cards/creatures.csv`).

## Creature card — BACK (deck back)

```
Trading card back design, Arcane × Valorant style: a stylized question mark
formed by a swirling flock/silhouette of tiny animal shapes (birds, fish, insects),
centered emblem on a deep teal-charcoal background with subtle topographic
contour lines, thin gold accent frame with corner paw-print ornaments, the word
"SPOTTED!" set in bold condensed display type across the bottom, painterly
cel-shaded texture, grain, dramatic but soft lighting. Symmetrical, readable
at small size, works when rotated 180°.
```

## Question card — FRONT

```
Stylized game card front, Arcane × Valorant style, cel-shaded painterly look:
a single large flat-design trait icon ([TRAIT]: class/habitat/size/diet/activity)
centered on a color-coded field ([CLASS=amber, HABITAT=green, SIZE=blue,
DIET=red, ACTIVITY=purple]), bold ink outline, subtle habitat texture watermark,
the question text in clean bold sans-serif on a dark band at the bottom.
2:3 vertical card, consistent series look.
```

## Special card — FRONT

Same composition as question cards but with a glowing gold-edged frame and a
unique glyph per special (Double Probe = twin crosshairs, Misdirect = half-mask,
Eavesdrop = ear/sound waves, Cross-Examine = crossing arrows, Wild Probe = star
burst). Gold frame = instantly readable as "special" from across the table.

## Palette & type

| Element | Value |
|---|---|
| Background base | #10262b (deep teal-charcoal) |
| Accent gold | #c9a227 |
| Class amber | #e0a13a |
| Habitat green | #3f9e63 |
| Size blue | #3a7fe0 |
| Diet red | #d4483b |
| Activity purple | #8a4fd4 |
| Display type | bold condensed sans (e.g. Tungsten/Impact family) |
| Body type | geometric sans (e.g. Inter/Montserrat) |

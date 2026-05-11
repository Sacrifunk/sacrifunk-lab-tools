/**
 * Sacrifunk theory constants: color palette, 12-tone names, JI ratios at C=256,
 * digital roots, and the scale dictionary (Sacrifunk originals + classical modes).
 *
 * Color contrast notes (WCAG 2.2 AA, 4.5:1 normal text on `bg`):
 *   bg          #08080e
 *   text        #e0e0f0   contrast ~17.4:1   ✅
 *   dim         #a8a8c0   contrast ~8.3:1    ✅  (was #6668 ≈ 2.6:1 ❌ in legacy)
 *   accent      #ff3355   contrast ~5.5:1    ✅
 *   feeder      #22cc66   contrast ~6.7:1    ✅
 *   axis        #ffd700   contrast ~12.4:1   ✅
 *   bright      #fff      contrast ~18.4:1   ✅
 */
export const Colors = {
  bg: "#08080e",
  panel: "#11111e",
  panelB: "#1e1e36",
  accent: "#ff3355",
  loop: "#ff3355",
  feeder: "#22cc66",
  axis: "#ffd700",
  text: "#e0e0f0",
  dim: "#a8a8c0",
  bright: "#ffffff",
  blue: "#4488ff",
  purple: "#aa55ff",
} as const;

export type ColorKey = keyof typeof Colors;

export const NOTE12 = [
  "C",
  "C#",
  "D",
  "Eb",
  "E",
  "F",
  "F#",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
] as const;

/** Just-Intonation ratios indexed by semitone offset from C. C=256 reference. */
export const JI5: Record<number, number> = {
  0: 1,
  1: 16 / 15,
  2: 9 / 8,
  3: 6 / 5,
  4: 5 / 4,
  5: 4 / 3,
  6: 45 / 32,
  7: 3 / 2,
  8: 8 / 5,
  9: 5 / 3,
  10: 9 / 5,
  11: 15 / 8,
};

/** Digital-root annotations for select semitones at C=256. */
export const JI_DR: Record<number, number> = {
  0: 4,
  2: 9,
  4: 5,
  6: 9,
  7: 6,
  11: 3,
};

/** Scale dictionary — 5 Sacrifunk originals + 10 classical modes. */
export const SCALES: Record<string, readonly number[]> = {
  Sacrifunk: [0, 1, 3, 6, 7, 8, 11],
  "Hyper Phrygian": [0, 1, 3, 4, 7, 8, 10],
  "Super Phrygian": [0, 1, 3, 4, 7, 8, 11],
  "Super Hyper Phr": [0, 1, 3, 4, 7, 8, 10, 11],
  Vibron: [0, 1, 2, 5, 6, 7, 9, 10, 11],
  "Ionian (Major)": [0, 2, 4, 5, 7, 9, 11],
  Dorian: [0, 2, 3, 5, 7, 9, 10],
  Phrygian: [0, 1, 3, 5, 7, 8, 10],
  "Aeolian (Minor)": [0, 2, 3, 5, 7, 8, 10],
  "Harmonic Minor": [0, 2, 3, 5, 7, 8, 11],
  "Double Harmonic": [0, 1, 4, 5, 7, 8, 11],
  "Hungarian Minor": [0, 2, 3, 6, 7, 8, 11],
  Blues: [0, 3, 5, 6, 7, 10],
  "Whole Tone": [0, 2, 4, 6, 8, 10],
  Chromatic: Array.from({ length: 12 }, (_, i) => i),
};

export type ScaleName = keyof typeof SCALES;

export const GENERATORS = [2, 3, 5, 7, 11] as const;
export const MULTIPLIER_PALETTE = [
  "#ff3355",
  "#4488ff",
  "#aa55ff",
  "#22cc66",
  "#ff8800",
] as const;

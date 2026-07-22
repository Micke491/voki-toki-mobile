export const MASK_CHAR = '•';

export interface DisplayChange {
  real: string;
  revealLast: boolean;
}

/**
 * The password TextInput renders a masked display string, not the real value.
 * Given the previous real value, the previous display string, and the display
 * string the native field just produced, reconstruct the new real value.
 *
 * Diff by longest common prefix + suffix of the display strings: the replaced
 * middle span maps 1:1 onto the real value (display and real always have equal
 * length), and inserted characters are literal keyboard input. This handles
 * typing, backspace, mid-string edits, selection replacement, and paste.
 */
export const applyDisplayChange = (
  prevReal: string,
  prevDisplay: string,
  nextDisplay: string
): DisplayChange => {
  let p = 0;
  while (
    p < prevDisplay.length &&
    p < nextDisplay.length &&
    prevDisplay[p] === nextDisplay[p]
  ) {
    p++;
  }

  let s = 0;
  while (
    s < prevDisplay.length - p &&
    s < nextDisplay.length - p &&
    prevDisplay[prevDisplay.length - 1 - s] === nextDisplay[nextDisplay.length - 1 - s]
  ) {
    s++;
  }

  const inserted = nextDisplay.slice(p, nextDisplay.length - s);
  const real = prevReal.slice(0, p) + inserted + prevReal.slice(prevDisplay.length - s);
  // Reveal only when new characters landed at the very end of the field.
  const revealLast = inserted.length > 0 && s === 0;

  return { real, revealLast };
};

/** Render the real value as mask dots, optionally exposing the last character. */
export const buildDisplay = (real: string, revealLast: boolean): string => {
  if (real.length === 0) return '';
  if (!revealLast) return MASK_CHAR.repeat(real.length);
  return MASK_CHAR.repeat(real.length - 1) + real[real.length - 1];
};

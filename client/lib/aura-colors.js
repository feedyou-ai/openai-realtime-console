export const AURA_COLOR = import.meta.env.VITE_AURA_COLOR || "#7373e0";

// NOT USED CURRENTLY, but can be used in the future for a more dynamic listening color based on the main aura color
export function deriveComplementaryColor(hexColor) {
  if (hexColor === "#7373e0") {
    return "#b474ff";
  }

  const normalized = hexColor.replace("#", "");

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return "#04a7b1";
  }

  const r = 255 - parseInt(normalized.slice(0, 2), 16);
  const g = 255 - parseInt(normalized.slice(2, 4), 16);
  const b = 255 - parseInt(normalized.slice(4, 6), 16);

  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

export const AURA_LISTENING_COLOR =
  import.meta.env.VITE_AURA_LISTENING_COLOR || deriveComplementaryColor(AURA_COLOR);

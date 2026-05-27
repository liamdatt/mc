export const colors = {
  red: "#E10600",
  redHover: "#c10500",
  redGlow: "rgba(225,6,0,0.18)",
  ink: "#0D0D0D",
  graphite: "#2B2B2B",
  mist: "#F2F2F2",
  pure: "#FFFFFF",
  grid: "rgba(225,6,0,0.06)",
} as const;

export const easing = {
  outExpo: [0.16, 1, 0.3, 1] as const,
  inOutQuart: [0.76, 0, 0.24, 1] as const,
  outBack: [0.34, 1.56, 0.64, 1] as const,
} as const;

export const durations = {
  xs: 0.2,
  sm: 0.4,
  md: 0.6,
  lg: 0.9,
  xl: 1.2,
} as const;

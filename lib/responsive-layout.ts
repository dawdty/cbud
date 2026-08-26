const TABLET_MIN_DIMENSION = 600;

export function getResponsiveControlScale(screenWidth: number, screenHeight: number) {
  return Math.min(screenWidth, screenHeight) >= TABLET_MIN_DIMENSION ? 1.25 : 1;
}

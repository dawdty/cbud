export const BUDDY_BASE_SIZE = 104;

const BUDDY_MIN_SIZE = 92;
const BUDDY_MAX_SIZE = 180;
const BUDDY_SCREEN_RATIO = BUDDY_BASE_SIZE / 390;

export function getResponsiveBuddySize(screenWidth: number, screenHeight: number) {
  return Math.min(
    BUDDY_MAX_SIZE,
    Math.max(BUDDY_MIN_SIZE, Math.round(Math.min(screenWidth, screenHeight) * BUDDY_SCREEN_RATIO)),
  );
}

import type { StyleProp, ViewStyle } from 'react-native';

export type BuddyAnimation = 'idle' | 'curious' | 'thinking' | 'celebrate' | 'error';

export type BuddyEyes = 'open' | 'closed';

export type BuddyGaze =
  | { type: 'offset'; x: number; y: number }
  | { type: 'point'; x: number; y: number };

export type BuddyProps = {
  /** A screen-reader description. Pass null when Buddy is purely decorative. */
  accessibilityLabel?: string | null;
  /** A one-shot animation. Change animationKey to replay the same animation. */
  animation?: BuddyAnimation;
  animationKey?: string | number;
  eyes?: BuddyEyes;
  gaze?: BuddyGaze;
  /** Width in logical pixels. Height scales proportionally. */
  size?: number;
  style?: StyleProp<ViewStyle>;
};

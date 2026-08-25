import { Buddy } from './Buddy';
import type { BuddyProps } from './types';

type PresetProps = Omit<BuddyProps, 'animation'>;

export function IdleBuddy(props: PresetProps) {
  return <Buddy {...props} animation="idle" />;
}

export function CuriousBuddy(props: PresetProps) {
  return <Buddy {...props} animation="curious" />;
}

export function CelebratingBuddy(props: PresetProps) {
  return <Buddy {...props} animation="celebrate" />;
}

export function ErrorBuddy(props: PresetProps) {
  return <Buddy {...props} animation="error" />;
}

export function PrivacyBuddy(props: PresetProps) {
  return <Buddy {...props} eyes="closed" gaze={props.gaze ?? { type: 'offset', x: 5.5, y: -6 }} />;
}

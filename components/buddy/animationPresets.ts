import { Animated, Easing } from 'react-native';

type CelebrationValues = {
  face: Animated.Value;
  eyeScale: Animated.Value;
  hopY: Animated.Value;
};

export function createFloatAnimation(floatY: Animated.Value) {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(floatY, { toValue: -5, duration: 1500, useNativeDriver: true }),
      Animated.timing(floatY, { toValue: 0, duration: 1500, useNativeDriver: true }),
    ]),
  );
}

export function createBlinkAnimation(blinkScale: Animated.Value) {
  return Animated.loop(
    Animated.sequence([
      Animated.delay(3200),
      Animated.timing(blinkScale, { toValue: 0.12, duration: 90, useNativeDriver: true }),
      Animated.timing(blinkScale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]),
  );
}

export function createCuriousAnimation(curiosityScale: Animated.Value) {
  return Animated.sequence([
    Animated.timing(curiosityScale, {
      toValue: 1.12,
      duration: 120,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }),
    Animated.delay(530),
    Animated.timing(curiosityScale, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }),
  ]);
}

export function createCelebrationAnimation({ face, eyeScale, hopY }: CelebrationValues) {
  const hop = Animated.sequence([
    Animated.delay(500),
    Animated.timing(hopY, { toValue: -14, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    Animated.timing(hopY, { toValue: 0, duration: 500, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    Animated.timing(hopY, { toValue: -14, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    Animated.timing(hopY, { toValue: 0, duration: 500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
  ]);

  const eyeSquish = Animated.sequence([
    Animated.delay(500),
    Animated.timing(eyeScale, { toValue: 0.88, duration: 500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    Animated.timing(eyeScale, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    Animated.timing(eyeScale, { toValue: 0.88, duration: 500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    Animated.timing(eyeScale, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
  ]);

  const faceMorph = Animated.sequence([
    Animated.delay(500),
    Animated.timing(face, { toValue: 1, duration: 220, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    Animated.delay(1560),
    Animated.timing(face, { toValue: 0, duration: 220, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
  ]);

  return Animated.parallel([hop, eyeSquish, faceMorph]);
}

export function createErrorAnimation(wobble: Animated.Value) {
  return Animated.sequence([
    Animated.timing(wobble, { toValue: -6, duration: 70, useNativeDriver: true }),
    Animated.timing(wobble, { toValue: 6, duration: 70, useNativeDriver: true }),
    Animated.timing(wobble, { toValue: -4, duration: 70, useNativeDriver: true }),
    Animated.timing(wobble, { toValue: 0, duration: 70, useNativeDriver: true }),
  ]);
}

import { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';

import {
  createBlinkAnimation,
  createCelebrationAnimation,
  createCuriousAnimation,
  createErrorAnimation,
  createFloatAnimation,
  createThinkingAnimation,
} from './animationPresets';
import type { BuddyAnimation, BuddyEyes, BuddyGaze } from './types';

type BuddyAnimationOptions = {
  animation: BuddyAnimation;
  animationKey?: string | number;
  eyeCenter?: { x: number; y: number };
  eyes: BuddyEyes;
  gaze?: BuddyGaze;
};

export function useBuddyAnimation({ animation, animationKey, eyeCenter, eyes, gaze }: BuddyAnimationOptions) {
  const floatY = useAnimatedValue(0);
  const blinkScale = useAnimatedValue(1);
  const curiosityScale = useAnimatedValue(1);
  const eyeX = useAnimatedValue(0);
  const eyeY = useAnimatedValue(0);
  const eyeScale = useAnimatedValue(1);
  const openEyeScale = useAnimatedValue(1);
  const highlightOpacity = useAnimatedValue(1);
  const closedEyeOpacity = useAnimatedValue(0);
  const celebrationFace = useAnimatedValue(0);
  const happyEyeScale = useAnimatedValue(1);
  const hopY = useAnimatedValue(0);
  const wobble = useAnimatedValue(0);
  const thinkingSquishY = useAnimatedValue(1);

  useEffect(() => {
    const float = createFloatAnimation(floatY);
    float.start();
    return () => float.stop();
  }, [floatY]);

  useEffect(() => {
    if (eyes === 'closed') {
      blinkScale.stopAnimation();
      blinkScale.setValue(1);
      return;
    }

    const blink = createBlinkAnimation(blinkScale);
    blink.start();
    return () => blink.stop();
  }, [blinkScale, eyes]);

  useEffect(() => {
    if (animation !== 'curious') {
      Animated.timing(curiosityScale, {
        toValue: 1,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
      return;
    }

    curiosityScale.stopAnimation();
    const curious = createCuriousAnimation(curiosityScale);
    curious.start();
    return () => curious.stop();
  }, [animation, animationKey, curiosityScale]);

  useEffect(() => {
    if (animation !== 'celebrate') return;

    hopY.setValue(0);
    celebrationFace.setValue(0);
    happyEyeScale.setValue(1);
    const celebration = createCelebrationAnimation({
      eyeScale: happyEyeScale,
      face: celebrationFace,
      hopY,
    });
    celebration.start();

    return () => {
      celebration.stop();
    };
  }, [animation, animationKey, celebrationFace, happyEyeScale, hopY]);

  useEffect(() => {
    if (animation !== 'error') return;

    wobble.setValue(0);
    const error = createErrorAnimation(wobble);
    error.start();
    return () => error.stop();
  }, [animation, animationKey, wobble]);

  useEffect(() => {
    thinkingSquishY.stopAnimation();
    if (animation !== 'thinking') {
      Animated.timing(thinkingSquishY, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
      return;
    }

    const thinking = createThinkingAnimation(thinkingSquishY);
    thinking.start();
    return () => thinking.stop();
  }, [animation, animationKey, thinkingSquishY]);

  useEffect(() => {
    const target = animation === 'thinking'
      ? { x: -5.5, y: -6.5 }
      : resolveGaze(gaze, eyeCenter);
    const targetScale = 1 - Math.min(Math.hypot(target.x, target.y) / 20, 1) * 0.13;
    const animations = [
      Animated.spring(eyeX, { toValue: target.x, useNativeDriver: true }),
      Animated.spring(eyeY, { toValue: target.y, useNativeDriver: true }),
      Animated.spring(eyeScale, { toValue: targetScale, useNativeDriver: true }),
    ];
    Animated.parallel(animations).start();
    return () => animations.forEach((item) => item.stop());
  }, [animation, eyeCenter, eyeScale, eyeX, eyeY, gaze]);

  useEffect(() => {
    const isClosed = eyes === 'closed';
    const eyeEasing = isClosed ? Easing.in(Easing.exp) : Easing.out(Easing.exp);
    const animations = [
      Animated.timing(openEyeScale, { toValue: isClosed ? 0.12 : 1, duration: 220, easing: eyeEasing, useNativeDriver: true }),
      Animated.timing(highlightOpacity, { toValue: isClosed ? 0 : 1, duration: 280, easing: eyeEasing, useNativeDriver: true }),
      Animated.timing(closedEyeOpacity, { toValue: isClosed ? 1 : 0, duration: 220, easing: eyeEasing, useNativeDriver: true }),
    ];
    Animated.parallel(animations).start();
    return () => animations.forEach((item) => item.stop());
  }, [closedEyeOpacity, eyes, highlightOpacity, openEyeScale]);

  return {
    blinkScale,
    celebrationFace,
    closedEyeOpacity,
    curiosityScale,
    eyeScale,
    eyeX,
    eyeY,
    floatY,
    happyEyeScale,
    highlightOpacity,
    hopY,
    openEyeScale,
    thinkingSquishY,
    wobble,
  };
}

function resolveGaze(gaze: BuddyGaze | undefined, eyeCenter: { x: number; y: number } | undefined) {
  if (!gaze) return { x: 0, y: 0 };
  if (gaze.type === 'offset') return { x: gaze.x, y: gaze.y };
  if (!eyeCenter) return { x: 0, y: 0 };

  const angle = Math.atan2(gaze.y - eyeCenter.y, gaze.x - eyeCenter.x);
  const gazeDistance = 15;
  return {
    x: Math.cos(angle) * gazeDistance,
    y: Math.sin(angle) * gazeDistance,
  };
}

function useAnimatedValue(initialValue: number) {
  const [value] = useState(() => new Animated.Value(initialValue));
  return value;
}

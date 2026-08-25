import { useRef, useState } from 'react';
import { Animated, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import type { BuddyProps } from './types';
import { useBuddyAnimation } from './useBuddyAnimation';

const BASE_WIDTH = 82;
const BASE_HEIGHT = 92;
const EYE_CENTER_Y = 33;

export function Buddy({
  accessibilityLabel = 'your cbud',
  animation = 'idle',
  animationKey,
  eyes = 'open',
  gaze,
  size = BASE_WIDTH,
  style,
}: BuddyProps) {
  const [eyeCenter, setEyeCenter] = useState<{ x: number; y: number }>();
  const buddyRef = useRef<View>(null);
  const scale = size / BASE_WIDTH;
  const height = BASE_HEIGHT * scale;
  const animated = useBuddyAnimation({ animation, animationKey, eyeCenter, eyes, gaze });

  const shadowScale = animated.floatY.interpolate({ inputRange: [-5, 0], outputRange: [1.18, 1.65] });
  const shadowOpacity = animated.floatY.interpolate({ inputRange: [-5, 0], outputRange: [0.12, 0.25] });
  const hopShadowScale = animated.hopY.interpolate({ inputRange: [-14, 0], outputRange: [0.76, 1] });
  const neutralEyeOpacity = animated.celebrationFace.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const neutralEyeWidth = animated.celebrationFace.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });
  const neutralEyeSquint = animated.celebrationFace.interpolate({ inputRange: [0, 1], outputRange: [1, 0.58] });
  const eyeVerticalWarp = animated.eyeY.interpolate({ inputRange: [-25, 0, 25], outputRange: [0.9, 1, 0.9] });

  const measureEyeCenter = (_event: LayoutChangeEvent) => {
    requestAnimationFrame(() => {
      buddyRef.current?.measureInWindow((x, y, width) => {
        setEyeCenter({ x: x + width / 2, y: y + EYE_CENTER_Y * scale });
      });
    });
  };

  return (
    <View
      accessibilityLabel={accessibilityLabel ?? undefined}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessible={Boolean(accessibilityLabel)}
      onLayout={measureEyeCenter}
      ref={buddyRef}
      style={[{ height, width: size }, style]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.canvas,
          {
            left: (size - BASE_WIDTH) / 2,
            top: (height - BASE_HEIGHT) / 2,
            transform: [{ scale }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.shadow,
            {
              opacity: shadowOpacity,
              transform: [{ scaleX: shadowScale }, { scaleX: hopShadowScale }, { scaleY: 0.5 }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.character,
            {
              transform: [
                { translateX: animated.wobble },
                { translateY: animated.floatY },
                { translateY: animated.hopY },
              ],
            },
          ]}
        >
          <View style={styles.body}>
            <HappyEye morph={animated.celebrationFace} side="left" squish={animated.happyEyeScale} />
            <HappyEye morph={animated.celebrationFace} side="right" squish={animated.happyEyeScale} />
            <Eye
              blinkScale={animated.blinkScale}
              curiosityScale={animated.curiosityScale}
              eyeScale={animated.eyeScale}
              eyeVerticalWarp={eyeVerticalWarp}
              eyeX={animated.eyeX}
              eyeY={animated.eyeY}
              highlightOpacity={animated.highlightOpacity}
              neutralEyeOpacity={neutralEyeOpacity}
              neutralEyeSquint={neutralEyeSquint}
              neutralEyeWidth={neutralEyeWidth}
              openEyeScale={animated.openEyeScale}
              side="left"
            />
            <Eye
              blinkScale={animated.blinkScale}
              curiosityScale={animated.curiosityScale}
              eyeScale={animated.eyeScale}
              eyeVerticalWarp={eyeVerticalWarp}
              eyeX={animated.eyeX}
              eyeY={animated.eyeY}
              highlightOpacity={animated.highlightOpacity}
              neutralEyeOpacity={neutralEyeOpacity}
              neutralEyeSquint={neutralEyeSquint}
              neutralEyeWidth={neutralEyeWidth}
              openEyeScale={animated.openEyeScale}
              side="right"
            />
            <ClosedEye opacity={animated.closedEyeOpacity} side="left" x={animated.eyeX} y={animated.eyeY} />
            <ClosedEye opacity={animated.closedEyeOpacity} side="right" x={animated.eyeX} y={animated.eyeY} />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

type EyeProps = {
  blinkScale: Animated.Value;
  curiosityScale: Animated.Value;
  eyeScale: Animated.Value;
  eyeVerticalWarp: Animated.AnimatedInterpolation<number>;
  eyeX: Animated.Value;
  eyeY: Animated.Value;
  highlightOpacity: Animated.Value;
  neutralEyeOpacity: Animated.AnimatedInterpolation<number>;
  neutralEyeSquint: Animated.AnimatedInterpolation<number>;
  neutralEyeWidth: Animated.AnimatedInterpolation<number>;
  openEyeScale: Animated.Value;
  side: 'left' | 'right';
};

function Eye({
  blinkScale,
  curiosityScale,
  eyeScale,
  eyeVerticalWarp,
  eyeX,
  eyeY,
  highlightOpacity,
  neutralEyeOpacity,
  neutralEyeSquint,
  neutralEyeWidth,
  openEyeScale,
  side,
}: EyeProps) {
  return (
    <Animated.View
      style={[
        styles.eyeAnchor,
        side === 'left' ? styles.leftEye : styles.rightEye,
        { transform: [{ translateX: eyeX }, { translateY: eyeY }] },
      ]}
    >
      <Animated.View
        style={[
          styles.eye,
          {
            opacity: neutralEyeOpacity,
            transform: [
              { scaleX: neutralEyeWidth },
              { scaleX: eyeScale },
              { scaleX: curiosityScale },
              { scaleY: neutralEyeSquint },
              { scaleY: blinkScale },
              { scaleY: openEyeScale },
              { scaleY: eyeScale },
              { scaleY: eyeVerticalWarp },
              { scaleY: curiosityScale },
            ],
          },
        ]}
      >
        <Animated.View style={[styles.eyeHighlight, { opacity: highlightOpacity }]} />
      </Animated.View>
    </Animated.View>
  );
}

function ClosedEye({ opacity, side, x, y }: { opacity: Animated.Value; side: 'left' | 'right'; x: Animated.Value; y: Animated.Value }) {
  return (
    <Animated.View
      style={[
        styles.closedEye,
        side === 'left' ? styles.leftClosedEye : styles.rightClosedEye,
        { opacity, transform: [{ translateX: x }, { translateY: y }] },
      ]}
    />
  );
}

function HappyEye({ morph, side, squish }: { morph: Animated.Value; side: 'left' | 'right'; squish: Animated.Value }) {
  return (
    <Animated.View
      style={[
        styles.happyEye,
        side === 'left' ? styles.leftHappyEye : styles.rightHappyEye,
        { opacity: morph, transform: [{ scaleY: squish }, { rotate: side === 'left' ? '-3deg' : '3deg' }] },
      ]}
    >
      <View style={[styles.happyEyeStroke, styles.leftHappyEyeStroke]} />
      <View style={[styles.happyEyeStroke, styles.rightHappyEyeStroke]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    height: BASE_HEIGHT,
    position: 'absolute',
    width: BASE_WIDTH,
  },
  character: {
    left: 3,
    position: 'absolute',
    top: 0,
  },
  shadow: {
    backgroundColor: '#2c0703',
    borderRadius: 14,
    bottom: -2.5,
    height: 28,
    left: 27,
    position: 'absolute',
    width: 28,
  },
  body: {
    backgroundColor: '#b6465f',
    borderColor: '#890620',
    borderRadius: 38,
    borderWidth: 2,
    height: 76,
    overflow: 'hidden',
    position: 'relative',
    width: 76,
  },
  eye: {
    backgroundColor: '#2c0703',
    borderRadius: 11,
    height: 20,
    overflow: 'hidden',
    width: 17,
  },
  eyeAnchor: {
    position: 'absolute',
    top: 23,
    width: 17,
  },
  leftEye: {
    left: 16,
  },
  rightEye: {
    right: 16,
  },
  eyeHighlight: {
    backgroundColor: '#ebd4cb',
    borderRadius: 3,
    height: 6,
    left: 3,
    position: 'absolute',
    top: 3,
    width: 6,
  },
  happyEye: {
    height: 10,
    position: 'absolute',
    top: 22,
    width: 17,
  },
  leftHappyEye: {
    left: 16,
  },
  rightHappyEye: {
    right: 16,
  },
  happyEyeStroke: {
    backgroundColor: '#2c0703',
    borderRadius: 1,
    height: 3,
    position: 'absolute',
    top: 4,
    width: 10,
  },
  leftHappyEyeStroke: {
    left: 0,
    transform: [{ rotate: '-42deg' }],
  },
  rightHappyEyeStroke: {
    right: 0,
    transform: [{ rotate: '42deg' }],
  },
  closedEye: {
    backgroundColor: '#2c0703',
    borderRadius: 1.5,
    height: 3,
    position: 'absolute',
    top: 32,
    width: 17,
  },
  leftClosedEye: {
    left: 16,
  },
  rightClosedEye: {
    right: 16,
  },
});

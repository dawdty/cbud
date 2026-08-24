import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

export type BuddyActiveField = 'email' | 'password' | 'code' | undefined;

type BuddyProps = {
  activeField?: BuddyActiveField;
  celebrate?: boolean;
  emailCursorTarget?: { x: number; y: number };
  emailTypingRevision?: number;
  hasError?: boolean;
};

export function Buddy({ activeField, celebrate = false, emailCursorTarget, emailTypingRevision = 0, hasError = false }: BuddyProps) {
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [eyeCenter, setEyeCenter] = useState<{ x: number; y: number }>();
  const buddyRef = useRef<View>(null);
  const floatY = useRef(new Animated.Value(0)).current;
  const blinkScale = useRef(new Animated.Value(1)).current;
  const curiosityScale = useRef(new Animated.Value(1)).current;
  const leftEyeX = useRef(new Animated.Value(0)).current;
  const leftEyeY = useRef(new Animated.Value(0)).current;
  const leftEyeScale = useRef(new Animated.Value(1)).current;
  const rightEyeX = useRef(new Animated.Value(0)).current;
  const rightEyeY = useRef(new Animated.Value(0)).current;
  const rightEyeScale = useRef(new Animated.Value(1)).current;
  const passwordEyeScale = useRef(new Animated.Value(1)).current;
  const highlightOpacity = useRef(new Animated.Value(1)).current;
  const closedEyeOpacity = useRef(new Animated.Value(0)).current;
  const celebrationFace = useRef(new Animated.Value(0)).current;
  const happyEyeScale = useRef(new Animated.Value(1)).current;
  const hopY = useRef(new Animated.Value(0)).current;
  const wobble = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: -5, duration: 1500, useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ]),
    );
    float.start();
    return () => float.stop();
  }, [floatY]);

  useEffect(() => {
    if (emailTypingRevision === 0) {
      Animated.timing(curiosityScale, { toValue: 1, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
      return;
    }

    Animated.timing(curiosityScale, { toValue: 1.12, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    const settleTimer = setTimeout(() => {
      Animated.timing(curiosityScale, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    }, 650);

    return () => clearTimeout(settleTimer);
  }, [curiosityScale, emailTypingRevision]);

  useEffect(() => {
    if (!celebrate) return;

    hopY.setValue(0);
    celebrationFace.setValue(0);
    happyEyeScale.setValue(1);
    setIsCelebrating(true);
    const hop = Animated.sequence([
      Animated.delay(500),
      Animated.timing(hopY, { toValue: -14, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(hopY, { toValue: 0, duration: 500, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(hopY, { toValue: -14, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(hopY, { toValue: 0, duration: 500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]);
    const eyeSquish = Animated.sequence([
      Animated.delay(500),
      Animated.timing(happyEyeScale, { toValue: 0.88, duration: 500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(happyEyeScale, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(happyEyeScale, { toValue: 0.88, duration: 500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(happyEyeScale, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]);
    const faceMorph = Animated.sequence([
      Animated.delay(500),
      Animated.timing(celebrationFace, { toValue: 1, duration: 220, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.delay(1560),
      Animated.timing(celebrationFace, { toValue: 0, duration: 220, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]);
    const celebration = Animated.parallel([hop, eyeSquish, faceMorph]);
    celebration.start(({ finished }) => {
      if (finished) setIsCelebrating(false);
    });
    return () => celebration.stop();
  }, [celebrate, celebrationFace, happyEyeScale, hopY]);

  useEffect(() => {
    if (activeField === 'password') {
      blinkScale.stopAnimation();
      blinkScale.setValue(1);
      return;
    }

    const blink = Animated.loop(
      Animated.sequence([
        Animated.delay(3200),
        Animated.timing(blinkScale, { toValue: 0.12, duration: 90, useNativeDriver: true }),
        Animated.timing(blinkScale, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]),
    );
    blink.start();
    return () => blink.stop();
  }, [activeField, blinkScale]);

  useEffect(() => {
    const isEnteringPassword = activeField === 'password';
    const eyeEasing = isEnteringPassword ? Easing.in(Easing.exp) : Easing.out(Easing.exp);
    const gazeForEyePair = () => {
      let x = activeField === 'code' ? 4 : activeField === 'password' ? 5.5 : 0;
      let y = activeField === 'password' ? -6 : 0;

      if (activeField === 'email' && emailCursorTarget && eyeCenter) {
        const angle = Math.atan2(emailCursorTarget.y - eyeCenter.y, emailCursorTarget.x - eyeCenter.x);
        const gazeDistance = 15;
        x = Math.cos(angle) * gazeDistance - 5;
        y = Math.sin(angle) * gazeDistance + 10;
      }

      const scale = 1 - Math.min(Math.hypot(x, y) / 20, 1) * 0.13;
      return { scale, x, y };
    };
    const pairGaze = gazeForEyePair();
    Animated.spring(leftEyeX, { toValue: pairGaze.x, useNativeDriver: true }).start();
    Animated.spring(leftEyeY, { toValue: pairGaze.y, useNativeDriver: true }).start();
    Animated.spring(leftEyeScale, { toValue: pairGaze.scale, useNativeDriver: true }).start();
    Animated.spring(rightEyeX, { toValue: pairGaze.x, useNativeDriver: true }).start();
    Animated.spring(rightEyeY, { toValue: pairGaze.y, useNativeDriver: true }).start();
    Animated.spring(rightEyeScale, { toValue: pairGaze.scale, useNativeDriver: true }).start();
    Animated.timing(passwordEyeScale, { toValue: isEnteringPassword ? 0.12 : 1, duration: 220, easing: eyeEasing, useNativeDriver: true }).start();
    Animated.timing(highlightOpacity, { toValue: isEnteringPassword ? 0 : 1, duration: 280, easing: eyeEasing, useNativeDriver: true }).start();
    Animated.timing(closedEyeOpacity, { toValue: isEnteringPassword ? 1 : 0, duration: 220, easing: eyeEasing, useNativeDriver: true }).start();
  }, [activeField, closedEyeOpacity, emailCursorTarget, eyeCenter, highlightOpacity, leftEyeScale, leftEyeX, leftEyeY, passwordEyeScale, rightEyeScale, rightEyeX, rightEyeY]);

  useEffect(() => {
    if (!hasError) return;
    wobble.setValue(0);
    Animated.sequence([
      Animated.timing(wobble, { toValue: -6, duration: 70, useNativeDriver: true }),
      Animated.timing(wobble, { toValue: 6, duration: 70, useNativeDriver: true }),
      Animated.timing(wobble, { toValue: -4, duration: 70, useNativeDriver: true }),
      Animated.timing(wobble, { toValue: 0, duration: 70, useNativeDriver: true }),
    ]).start();
  }, [hasError, wobble]);

  const shadowScale = floatY.interpolate({ inputRange: [-5, 0], outputRange: [1.18, 1.65] });
  const shadowOpacity = floatY.interpolate({ inputRange: [-5, 0], outputRange: [0.12, 0.25] });
  const hopShadowScale = hopY.interpolate({ inputRange: [-14, 0], outputRange: [0.76, 1] });
  const neutralEyeOpacity = celebrationFace.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const neutralEyeWidth = celebrationFace.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });
  const neutralEyeSquint = celebrationFace.interpolate({ inputRange: [0, 1], outputRange: [1, 0.58] });
  const leftEyeVerticalWarp = leftEyeY.interpolate({ inputRange: [-25, 0, 25], outputRange: [0.9, 1, 0.9] });
  const rightEyeVerticalWarp = rightEyeY.interpolate({ inputRange: [-25, 0, 25], outputRange: [0.9, 1, 0.9] });

  const measureEyeCenter = () => {
    requestAnimationFrame(() => {
      buddyRef.current?.measureInWindow((x, y) => setEyeCenter({ x: x + 41, y: y + 33 }));
    });
  };

  return (
    <View accessibilityLabel="your cbud" onLayout={measureEyeCenter} ref={buddyRef} style={styles.buddy}>
      <Animated.View style={[styles.shadow, { opacity: shadowOpacity, transform: [{ scaleX: shadowScale }, { scaleX: hopShadowScale }, { scaleY: 0.5 }] }]} />
      <Animated.View style={[styles.character, { transform: [{ translateX: wobble }, { translateY: floatY }, { translateY: hopY }] }]}>
        <View style={styles.body}>
          {isCelebrating ? (
            <>
              <HappyEye morph={celebrationFace} side="left" squish={happyEyeScale} />
              <HappyEye morph={celebrationFace} side="right" squish={happyEyeScale} />
            </>
          ) : null}
          <Animated.View style={[styles.eyeAnchor, styles.leftEye, { transform: [{ translateX: leftEyeX }, { translateY: leftEyeY }] }]}>
            <Animated.View style={[styles.eye, { opacity: neutralEyeOpacity, transform: [{ scaleX: neutralEyeWidth }, { scaleX: leftEyeScale }, { scaleX: curiosityScale }, { scaleY: neutralEyeSquint }, { scaleY: blinkScale }, { scaleY: passwordEyeScale }, { scaleY: leftEyeScale }, { scaleY: leftEyeVerticalWarp }, { scaleY: curiosityScale }] }]}>
              <Animated.View style={[styles.eyeHighlight, { opacity: highlightOpacity }]} />
            </Animated.View>
          </Animated.View>
          <Animated.View style={[styles.eyeAnchor, styles.rightEye, { transform: [{ translateX: rightEyeX }, { translateY: rightEyeY }] }]}>
            <Animated.View style={[styles.eye, { opacity: neutralEyeOpacity, transform: [{ scaleX: neutralEyeWidth }, { scaleX: rightEyeScale }, { scaleX: curiosityScale }, { scaleY: neutralEyeSquint }, { scaleY: blinkScale }, { scaleY: passwordEyeScale }, { scaleY: rightEyeScale }, { scaleY: rightEyeVerticalWarp }, { scaleY: curiosityScale }] }]}>
              <Animated.View style={[styles.eyeHighlight, { opacity: highlightOpacity }]} />
            </Animated.View>
          </Animated.View>
          <Animated.View style={[styles.closedEye, styles.leftClosedEye, { opacity: closedEyeOpacity, transform: [{ translateX: leftEyeX }, { translateY: leftEyeY }] }]} />
          <Animated.View style={[styles.closedEye, styles.rightClosedEye, { opacity: closedEyeOpacity, transform: [{ translateX: rightEyeX }, { translateY: rightEyeY }] }]} />
        </View>
      </Animated.View>
    </View>
  );
}

function HappyEye({ morph, side, squish }: { morph: Animated.Value; side: 'left' | 'right'; squish: Animated.Value }) {
  return (
    <Animated.View style={[styles.happyEye, side === 'left' ? styles.leftHappyEye : styles.rightHappyEye, { opacity: morph, transform: [{ scaleY: squish }, { rotate: side === 'left' ? '-3deg' : '3deg' }] }]}>
      <View style={[styles.happyEyeStroke, styles.leftHappyEyeStroke]} />
      <View style={[styles.happyEyeStroke, styles.rightHappyEyeStroke]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  buddy: {
    height: 92,
    position: 'relative',
    width: 82,
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

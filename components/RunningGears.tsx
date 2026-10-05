import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, View } from 'react-native';

export function RunningGears() {
  const [progress] = useState(() => new Animated.Value(0));
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    const updatePreference = (enabled: boolean) => {
      if (mounted) setReduceMotion(enabled);
    };

    void AccessibilityInfo.isReduceMotionEnabled()
      .then(updatePreference)
      .catch(() => updatePreference(false));
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', updatePreference);

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    progress.stopAnimation();
    progress.setValue(0);
    if (reduceMotion !== false) return;

    const spin = Animated.loop(Animated.timing(progress, {
      duration: 2200,
      easing: Easing.linear,
      isInteraction: false,
      toValue: 1,
      useNativeDriver: Platform.OS !== 'web',
    }));
    spin.start();
    return () => spin.stop();
  }, [progress, reduceMotion]);

  const largeRotation = progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const smallRotation = progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-720deg'] });

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.container}
    >
      <Gear rotation={largeRotation} size="large" />
      <Gear rotation={smallRotation} size="small" />
    </View>
  );
}

type GearProps = {
  rotation: Animated.AnimatedInterpolation<string | number>;
  size: 'large' | 'small';
};

function Gear({ rotation, size }: GearProps) {
  const isSmall = size === 'small';
  const frameStyle = isSmall ? styles.smallGear : styles.largeGear;
  const toothStyle = isSmall ? styles.smallTooth : styles.largeTooth;
  const coreStyle = isSmall ? styles.smallCore : styles.largeCore;
  const hubStyle = isSmall ? styles.smallHub : styles.largeHub;

  return (
    <Animated.View style={[styles.gear, frameStyle, { transform: [{ rotate: rotation }] }]}>
      <View style={[styles.tooth, toothStyle]} />
      <View style={[styles.tooth, toothStyle, styles.tooth45]} />
      <View style={[styles.tooth, toothStyle, styles.tooth90]} />
      <View style={[styles.tooth, toothStyle, styles.tooth135]} />
      <View style={[styles.core, coreStyle]} />
      <View style={[styles.hub, hubStyle]} />
    </Animated.View>
  );
}

const gearColor = '#744b00';
const cardColor = '#fff8f5';

const styles = StyleSheet.create({
  container: { height: 27, width: 34 },
  gear: { position: 'absolute' },
  largeGear: { height: 20, left: 0, top: 0, width: 20 },
  smallGear: { bottom: 0, height: 14, right: 0, width: 14 },
  tooth: { backgroundColor: gearColor, position: 'absolute' },
  largeTooth: { borderRadius: 2, height: 4, left: 0, top: 8, width: 20 },
  smallTooth: { borderRadius: 1.5, height: 3, left: 0, top: 5.5, width: 14 },
  tooth45: { transform: [{ rotate: '45deg' }] },
  tooth90: { transform: [{ rotate: '90deg' }] },
  tooth135: { transform: [{ rotate: '135deg' }] },
  core: { backgroundColor: gearColor, position: 'absolute' },
  largeCore: { borderRadius: 7, height: 14, left: 3, top: 3, width: 14 },
  smallCore: { borderRadius: 5, height: 10, left: 2, top: 2, width: 10 },
  hub: { backgroundColor: cardColor, position: 'absolute' },
  largeHub: { borderRadius: 3, height: 6, left: 7, top: 7, width: 6 },
  smallHub: { borderRadius: 2, height: 4, left: 5, top: 5, width: 4 },
});

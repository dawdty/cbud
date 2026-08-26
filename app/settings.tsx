import { useAuth } from '@clerk/expo';
import { Redirect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { getResponsiveControlScale } from '../lib/responsive-layout';

export default function MenuPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const controlScale = getResponsiveControlScale(screenWidth, screenHeight);

  if (!isLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#890620" />
      </View>
    );
  }

  if (!isSignedIn) {
    return <Redirect href="/" />;
  }

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/home');
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.wordmark}>cbud.</Text>
        <Text style={styles.heading}>menu</Text>

        <Pressable
          accessibilityLabel="Open to do's"
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/todos', params: { refresh: 'true' } })}
          style={({ pressed }) => [
            styles.menuItem,
            {
              borderRadius: 16 * controlScale,
              gap: 12 * controlScale,
              minHeight: 82 * controlScale,
              padding: 18 * controlScale,
            },
            pressed && styles.menuItemPressed,
          ]}
        >
          <View style={styles.menuItemCopy}>
            <Text style={[styles.menuItemTitle, { fontSize: 19 * controlScale }]}>to-dos</Text>
            <Text style={[styles.menuItemSubtitle, { fontSize: 14 * controlScale }]}>detected assignments and due dates</Text>
          </View>
          <Text accessibilityElementsHidden importantForAccessibility="no" style={[styles.arrow, { fontSize: 25 * controlScale, lineHeight: 28 * controlScale }]}>→</Text>
        </Pressable>

        <Pressable
          accessibilityLabel="Open jobs"
          accessibilityRole="button"
          onPress={() => router.push('/jobs')}
          style={({ pressed }) => [
            styles.menuItem,
            {
              borderRadius: 16 * controlScale,
              gap: 12 * controlScale,
              minHeight: 82 * controlScale,
              padding: 18 * controlScale,
            },
            pressed && styles.menuItemPressed,
          ]}
        >
          <View style={styles.menuItemCopy}>
            <Text style={[styles.menuItemTitle, { fontSize: 19 * controlScale }]}>jobs</Text>
            <Text style={[styles.menuItemSubtitle, { fontSize: 14 * controlScale }]}>scheduled refreshes and reminders</Text>
          </View>
          <Text accessibilityElementsHidden importantForAccessibility="no" style={[styles.arrow, { fontSize: 25 * controlScale, lineHeight: 28 * controlScale }]}>→</Text>
        </Pressable>

        <Pressable
          accessibilityLabel="Open settings"
          accessibilityRole="button"
          onPress={() => router.push('/preferences')}
          style={({ pressed }) => [
            styles.menuItem,
            {
              borderRadius: 16 * controlScale,
              gap: 12 * controlScale,
              minHeight: 82 * controlScale,
              padding: 18 * controlScale,
            },
            pressed && styles.menuItemPressed,
          ]}
        >
          <View style={styles.menuItemCopy}>
            <Text style={[styles.menuItemTitle, { fontSize: 19 * controlScale }]}>settings</Text>
            <Text style={[styles.menuItemSubtitle, { fontSize: 14 * controlScale }]}>canvas, memory, and account</Text>
          </View>
          <Text accessibilityElementsHidden importantForAccessibility="no" style={[styles.arrow, { fontSize: 25 * controlScale, lineHeight: 28 * controlScale }]}>→</Text>
        </Pressable>

        <Pressable
          accessibilityLabel="Go back"
          onPress={handleBack}
          style={[styles.backButton, { borderRadius: 12 * controlScale, paddingVertical: 16 * controlScale }]}
        >
          <Text style={[styles.backText, { fontSize: 16 * controlScale }]}>back</Text>
        </Pressable>
      </View>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#ebd4cb', flex: 1 },
  loading: { alignItems: 'center', backgroundColor: '#ebd4cb', flex: 1, justifyContent: 'center' },
  content: { flex: 1, gap: 16, padding: 28 },
  wordmark: { color: '#890620', fontSize: 38, fontWeight: '800', letterSpacing: -1.5, marginBottom: 18 },
  heading: { color: '#2c0703', fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  menuItem: { alignItems: 'center', backgroundColor: '#fff8f5', borderColor: '#cda49b', borderWidth: 1, flexDirection: 'row' },
  menuItemPressed: { opacity: 0.72 },
  menuItemCopy: { flex: 1, gap: 3 },
  menuItemTitle: { color: '#2c0703', fontWeight: '700' },
  menuItemSubtitle: { color: '#79534c' },
  arrow: { color: '#890620' },
  backButton: { alignItems: 'center', backgroundColor: '#890620', marginTop: 'auto' },
  backText: { color: '#fff', fontWeight: '700' },
});

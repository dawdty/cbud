import { useAuth } from '@clerk/expo';
import { Redirect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { getResponsiveControlScale } from '../lib/responsive-layout';

export default function CoursesPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const controlScale = getResponsiveControlScale(screenWidth, screenHeight);

  if (!isLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#890620" size="large" />
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

    router.replace('/settings');
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.wordmark}>cbud.</Text>
        <Text style={styles.heading}>courses</Text>
        <Text style={styles.copy}>your current canvas courses will show up here.</Text>

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
  copy: { color: '#79534c', fontSize: 16, lineHeight: 23 },
  backButton: { alignItems: 'center', backgroundColor: '#890620', marginTop: 'auto' },
  backText: { color: '#fff', fontWeight: '700' },
});

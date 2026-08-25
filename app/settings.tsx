import { useAuth } from '@clerk/expo';
import { Redirect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function MenuPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

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
          style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
        >
          <View style={styles.menuItemCopy}>
            <Text style={styles.menuItemTitle}>to do&apos;s</Text>
            <Text style={styles.menuItemSubtitle}>detected assignments and due dates</Text>
          </View>
          <Text accessibilityElementsHidden importantForAccessibility="no" style={styles.arrow}>→</Text>
        </Pressable>

        <Pressable
          accessibilityLabel="Open jobs"
          accessibilityRole="button"
          onPress={() => router.push('/jobs')}
          style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
        >
          <View style={styles.menuItemCopy}>
            <Text style={styles.menuItemTitle}>jobs</Text>
            <Text style={styles.menuItemSubtitle}>scheduled refreshes and reminders</Text>
          </View>
          <Text accessibilityElementsHidden importantForAccessibility="no" style={styles.arrow}>→</Text>
        </Pressable>

        <Pressable
          accessibilityLabel="Open settings"
          accessibilityRole="button"
          onPress={() => router.push('/preferences')}
          style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
        >
          <View style={styles.menuItemCopy}>
            <Text style={styles.menuItemTitle}>settings</Text>
            <Text style={styles.menuItemSubtitle}>canvas, memory, and account</Text>
          </View>
          <Text accessibilityElementsHidden importantForAccessibility="no" style={styles.arrow}>→</Text>
        </Pressable>

        <Pressable accessibilityLabel="Go back" onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backText}>back</Text>
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
  menuItem: { alignItems: 'center', backgroundColor: '#fff8f5', borderColor: '#cda49b', borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 12, minHeight: 82, padding: 18 },
  menuItemPressed: { opacity: 0.72 },
  menuItemCopy: { flex: 1, gap: 3 },
  menuItemTitle: { color: '#2c0703', fontSize: 19, fontWeight: '700' },
  menuItemSubtitle: { color: '#79534c', fontSize: 14 },
  arrow: { color: '#890620', fontSize: 25, lineHeight: 28 },
  backButton: { alignItems: 'center', backgroundColor: '#890620', borderRadius: 12, marginTop: 'auto', paddingVertical: 16 },
  backText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

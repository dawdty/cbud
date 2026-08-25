import { useAuth } from '@clerk/expo';
import { Redirect, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function SettingsPage() {
  const { isLoaded, isSignedIn, signOut } = useAuth();
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

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.wordmark}>cbud</Text>
        <Text style={styles.heading}>settings</Text>
        <Pressable accessibilityLabel="Sign out" onPress={handleSignOut} style={styles.signOutButton}>
          <Text style={styles.signOutText}>sign out</Text>
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
  signOutButton: { alignItems: 'center', backgroundColor: '#890620', borderRadius: 12, marginTop: 8, paddingVertical: 16 },
  signOutText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

import { useAuth, useUser } from '@clerk/expo';
import { Redirect, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { CelebratingBuddy } from '../components/buddy';

export default function HomePage() {
  const { isLoaded, isSignedIn, signOut } = useAuth();
  const { user } = useUser();
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
      <View style={styles.portal}>
        <View style={styles.introRow}>
          <View style={styles.introCopy}>
            <Text style={styles.wordmark}>cbud</Text>
            <Text style={styles.heading}>welcome{user?.firstName ? `, ${user.firstName.toLowerCase()}` : ''}</Text>
            <Text style={styles.copy}>you’re signed in.</Text>
          </View>
          <CelebratingBuddy />
        </View>
        <Pressable onPress={handleSignOut} style={styles.button}>
          <Text style={styles.buttonText}>sign out</Text>
        </Pressable>
      </View>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#ebd4cb', flex: 1 },
  loading: { alignItems: 'center', backgroundColor: '#ebd4cb', flex: 1, justifyContent: 'center' },
  portal: { flex: 1, gap: 16, justifyContent: 'center', padding: 28 },
  introRow: { alignItems: 'center', flexDirection: 'row', gap: 16 },
  introCopy: { flex: 1 },
  wordmark: { color: '#890620', fontSize: 38, fontWeight: '800', letterSpacing: -1.5, marginBottom: 18 },
  heading: { color: '#2c0703', fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  copy: { color: '#890620', fontSize: 16, lineHeight: 23, marginBottom: 10 },
  button: { alignItems: 'center', backgroundColor: '#890620', borderRadius: 12, marginTop: 4, paddingVertical: 16 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

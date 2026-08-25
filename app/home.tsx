import { useAuth, useUser } from '@clerk/expo';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { CelebratingBuddy } from '../components/buddy';

export default function HomePage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [message, setMessage] = useState('');

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

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.portal}>
        <View style={styles.introRow}>
          <View style={styles.introCopy}>
            <Text style={styles.wordmark}>cbud</Text>
            <Text style={styles.heading}>hey!{user?.firstName ? `, ${user.firstName.toLowerCase()}` : ''}</Text>
            <Text style={styles.copy}>what are we up to today?</Text>
          </View>
          <CelebratingBuddy />
        </View>
        <View style={styles.composer}>
          <Pressable accessibilityLabel="Open settings" onPress={() => router.push('/settings')} style={styles.iconButton}>
            <Text style={styles.gear}>⚙</Text>
          </Pressable>
          <TextInput
            accessibilityLabel="Message"
            onChangeText={setMessage}
            placeholder="Message cbud..."
            placeholderTextColor="#8f6e67"
            style={styles.input}
            value={message}
          />
          <Pressable accessibilityLabel="Send message" disabled={!message.trim()} style={[styles.iconButton, !message.trim() && styles.iconButtonDisabled]}>
            <Text style={styles.arrow}>→</Text>
          </Pressable>
        </View>
      </View>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#ebd4cb', flex: 1 },
  loading: { alignItems: 'center', backgroundColor: '#ebd4cb', flex: 1, justifyContent: 'center' },
  portal: { flex: 1, gap: 16, justifyContent: 'space-between', padding: 28 },
  introRow: { alignItems: 'center', flexDirection: 'row', gap: 16, marginTop: 'auto' },
  introCopy: { flex: 1 },
  wordmark: { color: '#890620', fontSize: 38, fontWeight: '800', letterSpacing: -1.5, marginBottom: 18 },
  heading: { color: '#2c0703', fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  copy: { color: '#890620', fontSize: 16, lineHeight: 23, marginBottom: 10 },
  composer: { alignItems: 'center', flexDirection: 'row', gap: 10, marginTop: 'auto' },
  iconButton: { alignItems: 'center', backgroundColor: '#890620', borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  iconButtonDisabled: { backgroundColor: '#bd8d87' },
  gear: { color: '#fff', fontSize: 22, lineHeight: 25 },
  input: { backgroundColor: '#fff8f5', borderColor: '#cda49b', borderRadius: 22, borderWidth: 1, color: '#2c0703', flex: 1, fontSize: 16, height: 44, paddingHorizontal: 16 },
  arrow: { color: '#fff', fontSize: 24, lineHeight: 26 },
});

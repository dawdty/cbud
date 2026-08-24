import { ClerkProvider, useAuth, useUser } from '@clerk/expo';
import { useHostedAuth } from '@clerk/expo/hosted-auth';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Button, StyleSheet, Text, View } from 'react-native';

import { tokenCache } from '@clerk/expo/token-cache';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error('Set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env before starting cbud.');
}

export default function App() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <AuthScreen />
    </ClerkProvider>
  );
}

function AuthScreen() {
  const { isLoaded, isSignedIn, signOut } = useAuth();
  const { user } = useUser();
  const { startHostedAuth } = useHostedAuth();

  if (!isLoaded) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const startAuth = async (mode: 'sign-in' | 'sign-up') => {
    await startHostedAuth({ mode });
  };

  return (
    <View style={styles.container}>
      {isSignedIn ? (
        <>
          <Text style={styles.title}>Welcome{user?.firstName ? `, ${user.firstName}` : ''}!</Text>
          <Text style={styles.subtitle}>You’re signed in to cbud.</Text>
          <Button title="Sign out" onPress={() => signOut()} />
        </>
      ) : (
        <>
          <Text style={styles.title}>cbud</Text>
          <Text style={styles.subtitle}>Sign in or create an account to continue.</Text>
          <Button title="Sign in" onPress={() => startAuth('sign-in')} />
          <Button title="Create account" onPress={() => startAuth('sign-up')} />
        </>
      )}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
});

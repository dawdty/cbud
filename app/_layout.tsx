import { ClerkProvider } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { Stack } from 'expo-router';

import { SubscriptionProvider } from '../lib/subscriptions';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error('Set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env before starting cbud.');
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <SubscriptionProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </SubscriptionProvider>
    </ClerkProvider>
  );
}

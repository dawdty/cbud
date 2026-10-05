import { ClerkProvider } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { SubscriptionProvider } from '../lib/subscriptions';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error('Set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env before starting cbud.');
}

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

function useNotificationNavigation() {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const openNotification = (notification: Notifications.Notification) => {
      const url = notification.request.content.data?.url;
      if (url === '/jobs' || url === '/todos') router.push(url);
    };

    const initialResponse = Notifications.getLastNotificationResponse();
    if (initialResponse?.notification) openNotification(initialResponse.notification);

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      openNotification(response.notification);
    });
    return () => subscription.remove();
  }, []);
}

export default function RootLayout() {
  useNotificationNavigation();

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <SubscriptionProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </SubscriptionProvider>
    </ClerkProvider>
  );
}

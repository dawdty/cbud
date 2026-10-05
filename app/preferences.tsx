import { useAuth } from '@clerk/expo';
import { Redirect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { notifyAccountDataCleared } from '../lib/account-data-events';
import { clearJobNotifications } from '../lib/job-notifications';
import { getResponsiveControlScale } from '../lib/responsive-layout';

type CanvasConnection = {
  baseUrl: string;
  canvasUserName: string;
};

type CanvasStatus =
  | { connected: false }
  | { connected: true; connection: CanvasConnection };

const apiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

function canvasProfileUrl(canvasUrl: string): string {
  const candidate = canvasUrl.trim();
  const url = new URL(candidate.includes('://') ? candidate : `https://${candidate}`);

  if (url.protocol !== 'https:') {
    throw new Error('Enter your school Canvas URL');
  }

  return new URL('/profile/settings', url.origin).toString();
}

export default function PreferencesPage() {
  const { getToken, isLoaded, isSignedIn, signOut } = useAuth();
  const router = useRouter();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const controlScale = getResponsiveControlScale(screenWidth, screenHeight);
  const [canvasStatus, setCanvasStatus] = useState<CanvasStatus | null>(null);
  const [showCanvasForm, setShowCanvasForm] = useState(false);
  const [canvasUrl, setCanvasUrl] = useState('');
  const [canvasAccessToken, setCanvasAccessToken] = useState('');
  const [isSavingCanvas, setIsSavingCanvas] = useState(false);
  const [canvasError, setCanvasError] = useState<string | null>(null);
  const [isClearingMemory, setIsClearingMemory] = useState(false);
  const [memoryMessage, setMemoryMessage] = useState<
    { kind: 'success' | 'error'; text: string } | null
  >(null);
  const [isClearingData, setIsClearingData] = useState(false);
  const [dataMessage, setDataMessage] = useState<
    { kind: 'success' | 'error'; text: string } | null
  >(null);

  const authorizedRequest = useCallback(
    async (path: string, init?: RequestInit) => {
      if (!apiUrl) {
        throw new Error('Set EXPO_PUBLIC_API_URL to connect cbud to the API.');
      }

      const token = await getToken();
      if (!token) {
        throw new Error('Your session expired. Please sign in again.');
      }

      return fetch(`${apiUrl}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
          ...init?.headers,
        },
      });
    },
    [getToken],
  );

  const loadCanvasStatus = useCallback(async () => {
    try {
      const response = await authorizedRequest('/integrations/canvas');
      const body = (await response.json()) as CanvasStatus & { error?: unknown };

      if (!response.ok) {
        throw new Error(typeof body.error === 'string' ? body.error : 'Could not load Canvas connection.');
      }

      setCanvasStatus(body);
      setCanvasError(null);
    } catch (error) {
      setCanvasStatus({ connected: false });
      setCanvasError(error instanceof Error ? error.message : 'Could not load Canvas connection.');
    }
  }, [authorizedRequest]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    const frame = requestAnimationFrame(() => void loadCanvasStatus());
    return () => cancelAnimationFrame(frame);
  }, [isLoaded, isSignedIn, loadCanvasStatus]);

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
    await clearJobNotifications().catch(() => undefined);
    await signOut();
    router.replace('/');
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/home');
  };

  const handleOpenCanvas = async () => {
    try {
      setCanvasError(null);
      await WebBrowser.openBrowserAsync(canvasProfileUrl(canvasUrl));
    } catch {
      setCanvasError('Enter your school Canvas URL first.');
    }
  };

  const handleConnectCanvas = async () => {
    if (isSavingCanvas) {
      return;
    }

    setIsSavingCanvas(true);
    setCanvasError(null);

    try {
      const response = await authorizedRequest('/integrations/canvas', {
        method: 'PUT',
        body: JSON.stringify({ canvasUrl, accessToken: canvasAccessToken }),
      });
      const body = (await response.json()) as CanvasStatus & { error?: unknown };

      if (!response.ok) {
        throw new Error(typeof body.error === 'string' ? body.error : 'Could not connect Canvas.');
      }

      setCanvasStatus(body);
      setCanvasAccessToken('');
      setShowCanvasForm(false);
    } catch (error) {
      setCanvasError(error instanceof Error ? error.message : 'Could not connect Canvas.');
    } finally {
      setIsSavingCanvas(false);
    }
  };

  const handleDisconnectCanvas = async () => {
    setIsSavingCanvas(true);
    setCanvasError(null);

    try {
      const response = await authorizedRequest('/integrations/canvas', { method: 'DELETE' });
      if (!response.ok) {
        const body = (await response.json()) as { error?: unknown };
        throw new Error(typeof body.error === 'string' ? body.error : 'Could not disconnect Canvas.');
      }

      setCanvasStatus({ connected: false });
      setCanvasUrl('');
    } catch (error) {
      setCanvasError(error instanceof Error ? error.message : 'Could not disconnect Canvas.');
    } finally {
      setIsSavingCanvas(false);
    }
  };

  const clearMemory = async () => {
    if (isClearingMemory) return;

    setIsClearingMemory(true);
    setMemoryMessage(null);

    try {
      const response = await authorizedRequest('/memory', { method: 'DELETE' });
      const body = (await response.json()) as { cleared?: unknown; error?: unknown };
      if (!response.ok || body.cleared !== true) {
        throw new Error(typeof body.error === 'string' ? body.error : 'Could not clear memory.');
      }

      notifyAccountDataCleared();
      setMemoryMessage({ kind: 'success', text: 'memory cleared' });
    } catch (error) {
      setMemoryMessage({
        kind: 'error',
        text: error instanceof Error ? error.message : 'Could not clear memory.',
      });
    } finally {
      setIsClearingMemory(false);
    }
  };

  const handleClearMemory = () => {
    Alert.alert(
      'clear memory?',
      'this deletes your saved chats and cached assignment context. your canvas connection stays enabled.',
      [
        { text: 'cancel', style: 'cancel' },
        { text: 'clear', style: 'destructive', onPress: () => void clearMemory() },
      ],
    );
  };

  const clearAccountData = async () => {
    if (isClearingData) return;

    setIsClearingData(true);
    setDataMessage(null);
    setMemoryMessage(null);

    try {
      const response = await authorizedRequest('/account-data', { method: 'DELETE' });
      const body = (await response.json()) as {
        cleared?: unknown;
        canvasConnectionPreserved?: unknown;
        jobsCleared?: unknown;
        usageAndBillingPreserved?: unknown;
        error?: unknown;
      };
      if (
        !response.ok ||
        body.cleared !== true ||
        body.canvasConnectionPreserved !== true ||
        body.jobsCleared !== true ||
        body.usageAndBillingPreserved !== true
      ) {
        throw new Error(typeof body.error === 'string' ? body.error : 'Could not clear account data.');
      }

      notifyAccountDataCleared();
      await clearJobNotifications().catch(() => undefined);
      setDataMessage({
        kind: 'success',
        text: 'app data cleared. canvas and usage records were preserved.',
      });
    } catch (error) {
      setDataMessage({
        kind: 'error',
        text: error instanceof Error ? error.message : 'Could not clear account data.',
      });
    } finally {
      setIsClearingData(false);
    }
  };

  const handleClearAccountData = () => {
    Alert.alert(
      'clear all app data?',
      'this permanently deletes your chats, detected assignments, cached context, and scheduled jobs. your canvas connection, access token, and usage or billing records stay saved.',
      [
        { text: 'cancel', style: 'cancel' },
        { text: 'clear all', style: 'destructive', onPress: () => void clearAccountData() },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>
        <View style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.wordmark}>cbud.</Text>
            <Text style={styles.heading}>settings</Text>
          </View>

          <Pressable
            accessibilityLabel="Open plans"
            accessibilityRole="button"
            onPress={() => router.push('/plans')}
            style={({ pressed }) => [
              styles.plansButton,
              {
                borderRadius: 12 * controlScale,
                minHeight: 48 * controlScale,
                paddingHorizontal: 16 * controlScale,
              },
              pressed && styles.plansButtonPressed,
            ]}
          >
            <Text style={[styles.plansButtonText, { fontSize: 16 * controlScale }]}>view plans</Text>
            <Text accessibilityElementsHidden style={[styles.plansButtonArrow, { fontSize: 19 * controlScale }]}>→</Text>
          </Pressable>

          <View style={styles.settingsBox}>
            <ScrollView
              contentContainerStyle={styles.sections}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleGroup}>
                <Text style={styles.cardTitle}>canvas</Text>
                <Text style={styles.cardSubtitle}>
                  {canvasStatus?.connected
                    ? `connected as ${canvasStatus.connection.canvasUserName.toLowerCase()}`
                    : 'connect your courses and assignments'}
                </Text>
              </View>
              {canvasStatus === null ? <ActivityIndicator color="#890620" size="small" /> : null}
            </View>

            {canvasStatus?.connected ? (
              <>
                <Text numberOfLines={1} style={styles.connectedUrl}>
                  {canvasStatus.connection.baseUrl}
                </Text>
                <Pressable
                  accessibilityLabel="Disconnect Canvas"
                  disabled={isSavingCanvas}
                  onPress={() => void handleDisconnectCanvas()}
                  style={[
                    styles.secondaryButton,
                    {
                      borderRadius: 12 * controlScale,
                      minHeight: 46 * controlScale,
                      paddingHorizontal: 16 * controlScale,
                    },
                  ]}
                >
                  <Text style={[styles.secondaryButtonText, { fontSize: 15 * controlScale }]}>disconnect canvas</Text>
                </Pressable>
              </>
            ) : showCanvasForm ? (
              <View style={styles.canvasForm}>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  onChangeText={setCanvasUrl}
                  placeholder="canvas.yourschool.edu"
                  placeholderTextColor="#8f6e67"
                  style={[
                    styles.input,
                    {
                      borderRadius: 10 * controlScale,
                      fontSize: 16 * controlScale,
                      height: 48 * controlScale,
                      paddingHorizontal: 14 * controlScale,
                    },
                  ]}
                  value={canvasUrl}
                />
                <Text style={styles.helpText}>
                  sign in to canvas, then create a new access token on your settings page
                </Text>
                <Pressable accessibilityLabel="Sign in and open Canvas settings" onPress={() => void handleOpenCanvas()}>
                  <Text style={[styles.linkText, { fontSize: 14 * controlScale, paddingVertical: 4 * controlScale }]}>sign in &amp; open canvas settings ↗</Text>
                </Pressable>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={setCanvasAccessToken}
                  placeholder="canvas access token"
                  placeholderTextColor="#8f6e67"
                  secureTextEntry
                  style={[
                    styles.input,
                    {
                      borderRadius: 10 * controlScale,
                      fontSize: 16 * controlScale,
                      height: 48 * controlScale,
                      paddingHorizontal: 14 * controlScale,
                    },
                  ]}
                  value={canvasAccessToken}
                />
                <Pressable
                  accessibilityLabel="Connect Canvas"
                  disabled={isSavingCanvas || !canvasUrl.trim() || !canvasAccessToken.trim()}
                  onPress={() => void handleConnectCanvas()}
                  style={[
                    styles.primaryButton,
                    {
                      borderRadius: 12 * controlScale,
                      minHeight: 48 * controlScale,
                      paddingHorizontal: 16 * controlScale,
                    },
                    (isSavingCanvas || !canvasUrl.trim() || !canvasAccessToken.trim()) && styles.buttonDisabled,
                  ]}
                >
                  {isSavingCanvas ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={[styles.primaryButtonText, { fontSize: 16 * controlScale }]}>connect</Text>
                  )}
                </Pressable>
              </View>
            ) : (
              <Pressable
                accessibilityLabel="Enable Canvas"
                onPress={() => {
                  setCanvasError(null);
                  setShowCanvasForm(true);
                }}
                style={[
                  styles.primaryButton,
                  {
                    borderRadius: 12 * controlScale,
                    minHeight: 48 * controlScale,
                    paddingHorizontal: 16 * controlScale,
                  },
                ]}
              >
                <Text style={[styles.primaryButtonText, { fontSize: 16 * controlScale }]}>enable canvas</Text>
              </Pressable>
            )}

            {canvasError ? (
              <Text accessibilityLiveRegion="polite" style={styles.errorText}>
                {canvasError}
              </Text>
            ) : null}
          </View>

          <View style={styles.card}>
            <View style={styles.cardTitleGroup}>
              <Text style={styles.cardTitle}>memory</Text>
              <Text style={styles.cardSubtitle}>
                delete saved chats and cached assignment context
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Clear memory"
              disabled={isClearingMemory}
              onPress={handleClearMemory}
              style={[
                styles.dangerButton,
                {
                  borderRadius: 12 * controlScale,
                  minHeight: 48 * controlScale,
                  paddingHorizontal: 16 * controlScale,
                },
                isClearingMemory && styles.buttonDisabled,
              ]}
            >
              {isClearingMemory ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={[styles.primaryButtonText, { fontSize: 16 * controlScale }]}>clear memory</Text>
              )}
            </Pressable>
            {memoryMessage ? (
              <Text
                accessibilityLiveRegion="polite"
                style={memoryMessage.kind === 'error' ? styles.errorText : styles.successText}
              >
                {memoryMessage.text}
              </Text>
            ) : null}
          </View>

          <View style={styles.card}>
            <View style={styles.cardTitleGroup}>
              <Text style={styles.cardTitle}>account data</Text>
              <Text style={styles.cardSubtitle}>
                delete chats, assignments, and jobs while preserving canvas and usage records
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Clear app data while preserving Canvas authentication and usage records"
              disabled={isClearingData}
              onPress={handleClearAccountData}
              style={[
                styles.dangerButton,
                {
                  borderRadius: 12 * controlScale,
                  minHeight: 48 * controlScale,
                  paddingHorizontal: 16 * controlScale,
                },
                isClearingData && styles.buttonDisabled,
              ]}
            >
              {isClearingData ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={[styles.primaryButtonText, { fontSize: 16 * controlScale }]}>clear all data</Text>
              )}
            </Pressable>
            {dataMessage ? (
              <Text
                accessibilityLiveRegion="polite"
                style={dataMessage.kind === 'error' ? styles.errorText : styles.successText}
              >
                {dataMessage.text}
              </Text>
            ) : null}
          </View>

            </ScrollView>
          </View>

          <View style={[styles.footerActions, { gap: 8 * controlScale }]}>
            <Pressable accessibilityLabel="Sign out" onPress={handleSignOut} style={[styles.signOutButton, { paddingVertical: 12 * controlScale }]}>
              <Text style={[styles.signOutText, { fontSize: 16 * controlScale }]}>sign out</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Go back"
              onPress={handleBack}
              style={[styles.backButton, { borderRadius: 12 * controlScale, paddingVertical: 16 * controlScale }]}
            >
              <Text style={[styles.backText, { fontSize: 16 * controlScale }]}>back</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#ebd4cb', flex: 1 },
  keyboardView: { flex: 1 },
  loading: { alignItems: 'center', backgroundColor: '#ebd4cb', flex: 1, justifyContent: 'center' },
  page: { flex: 1, gap: 14, paddingBottom: 16, paddingHorizontal: 28, paddingTop: 28 },
  header: { gap: 4 },
  wordmark: { color: '#890620', fontSize: 38, fontWeight: '800', letterSpacing: -1.5, marginBottom: 4 },
  heading: { color: '#2c0703', fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  plansButton: { alignItems: 'center', backgroundColor: '#fff8f5', borderColor: '#890620', borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between' },
  plansButtonPressed: { opacity: 0.72 },
  plansButtonText: { color: '#890620', fontWeight: '700' },
  plansButtonArrow: { color: '#890620', fontWeight: '700' },
  settingsBox: { backgroundColor: '#e4c3b8', borderColor: '#c3978e', borderRadius: 18, borderWidth: 1, flex: 1, overflow: 'hidden' },
  sections: { gap: 12, padding: 12 },
  card: { backgroundColor: '#fff8f5', borderColor: '#cda49b', borderRadius: 16, borderWidth: 1, gap: 14, padding: 18 },
  cardHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  cardTitleGroup: { flex: 1, gap: 3 },
  cardTitle: { color: '#2c0703', fontSize: 19, fontWeight: '700' },
  cardSubtitle: { color: '#79534c', fontSize: 14 },
  connectedUrl: { color: '#79534c', fontSize: 13 },
  canvasForm: { gap: 12 },
  input: { backgroundColor: '#fff', borderColor: '#cda49b', borderRadius: 10, borderWidth: 1, color: '#2c0703', fontSize: 16, height: 48, paddingHorizontal: 14 },
  helpText: { color: '#79534c', fontSize: 13, lineHeight: 19 },
  linkText: { color: '#890620', fontSize: 14, fontWeight: '700' },
  primaryButton: { alignItems: 'center', backgroundColor: '#890620', borderRadius: 12, minHeight: 48, justifyContent: 'center', paddingHorizontal: 16 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryButton: { alignItems: 'center', borderColor: '#890620', borderRadius: 12, borderWidth: 1, minHeight: 46, justifyContent: 'center', paddingHorizontal: 16 },
  secondaryButtonText: { color: '#890620', fontSize: 15, fontWeight: '700' },
  dangerButton: { alignItems: 'center', backgroundColor: '#890620', borderRadius: 12, minHeight: 48, justifyContent: 'center', paddingHorizontal: 16 },
  buttonDisabled: { backgroundColor: '#bd8d87' },
  errorText: { color: '#890620', fontSize: 13, lineHeight: 18 },
  successText: { color: '#386641', fontSize: 13, lineHeight: 18 },
  footerActions: {},
  signOutButton: { alignItems: 'center', paddingVertical: 12 },
  signOutText: { color: '#890620', fontSize: 16, fontWeight: '700' },
  backButton: { alignItems: 'center', backgroundColor: '#890620', borderRadius: 12, paddingVertical: 16 },
  backText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

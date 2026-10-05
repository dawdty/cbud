import { useAuth } from '@clerk/expo';
import { Redirect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { RunningGears } from '../components/RunningGears';

import {
  getJobNotificationPermission,
  JobNotificationPermission,
  ReminderJob,
  requestJobNotificationPermission,
  syncJobNotifications,
} from '../lib/job-notifications';

type AppJob = ReminderJob;
const apiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

type BillingStatus = { tier: 'free' | 'class_bud' };

function isAppJob(value: unknown): value is AppJob {
  if (!value || typeof value !== 'object') return false;
  const job = value as Partial<AppJob>;
  return (
    typeof job.id === 'string' &&
    (job.type === 'agent_query' || job.type === 'refresh_assignments' || job.type === 'remind_user') &&
    ['scheduled', 'running', 'completed', 'failed'].includes(job.status ?? '') &&
    typeof job.runAt === 'string' &&
    (job.message === null || typeof job.message === 'string')
  );
}

function jobTitle(type: AppJob['type']): string {
  if (type === 'agent_query') return 'scheduled task';
  return type === 'refresh_assignments' ? 'refresh assignments' : 'reminder';
}

function runLabel(job: AppJob): string {
  const date = new Date(job.runAt);
  if (Number.isNaN(date.getTime())) return 'schedule unavailable';
  const formatted = new Intl.DateTimeFormat(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(date);
  if (job.status === 'scheduled') return `runs ${formatted}`;
  if (job.status === 'running') return `started ${formatted}`;
  return `ran ${formatted}`;
}

function jobOrder(left: AppJob, right: AppJob): number {
  const priority = { running: 0, scheduled: 1, failed: 2, completed: 3 };
  const statusDifference = priority[left.status] - priority[right.status];
  if (statusDifference !== 0) return statusDifference;
  const leftTime = new Date(left.runAt).getTime();
  const rightTime = new Date(right.runAt).getTime();
  const safeLeftTime = Number.isNaN(leftTime) ? Number.MAX_SAFE_INTEGER : leftTime;
  const safeRightTime = Number.isNaN(rightTime) ? Number.MAX_SAFE_INTEGER : rightTime;
  return left.status === 'scheduled' ? safeLeftTime - safeRightTime : safeRightTime - safeLeftTime;
}

export default function JobsPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const hasLoadedOnArrival = useRef(false);
  const [jobs, setJobs] = useState<AppJob[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<JobNotificationPermission | 'loading'>('loading');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEnablingNotifications, setIsEnablingNotifications] = useState(false);
  const [cancellingJobId, setCancellingJobId] = useState<string | null>(null);
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);

  const loadJobs = useCallback(async (refreshing = false) => {
    if (!apiUrl) {
      setError('Set EXPO_PUBLIC_API_URL to connect cbud to the API.');
      setJobs([]);
      return;
    }
    if (refreshing) setIsRefreshing(true);
    setError(null);
    setBillingError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('Your session expired. Please sign in again.');
      const response = await fetch(`${apiUrl}/jobs${refreshing ? '?refresh=true' : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await response.json()) as { jobs?: unknown; error?: unknown };
      if (!response.ok || !Array.isArray(body.jobs)) {
        throw new Error(typeof body.error === 'string' ? body.error : 'Could not load jobs.');
      }

      const nextJobs = body.jobs.filter(isAppJob);
      setJobs(nextJobs);
      const billingResponse = await fetch(`${apiUrl}/billing/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const billingBody = await billingResponse.json() as Partial<BillingStatus> & { error?: unknown };
      if (!billingResponse.ok || (billingBody.tier !== 'free' && billingBody.tier !== 'class_bud')) {
        setBillingStatus(null);
        setBillingError(typeof billingBody.error === 'string' ? billingBody.error : 'Could not load subscription status. Retry to try again.');
      } else {
        setBillingStatus(billingBody as BillingStatus);
      }
      try {
        await syncJobNotifications(nextJobs);
      } catch {
        setNotificationMessage('Jobs loaded, but device reminders could not be updated.');
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load jobs.');
      setJobs((current) => current ?? []);
    } finally {
      if (refreshing) setIsRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || hasLoadedOnArrival.current) return;
    hasLoadedOnArrival.current = true;
    const frame = requestAnimationFrame(() => void loadJobs());
    return () => cancelAnimationFrame(frame);
  }, [isLoaded, isSignedIn, loadJobs]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    void getJobNotificationPermission().then(setNotificationPermission).catch(() => setNotificationPermission('disabled'));
  }, [isLoaded, isSignedIn]);

  const sortedJobs = useMemo(() => [...(jobs ?? [])].sort(jobOrder), [jobs]);
  const upcomingCount = useMemo(
    () => sortedJobs.filter((job) => job.status === 'scheduled' || job.status === 'running').length,
    [sortedJobs],
  );

  if (!isLoaded) {
    return <View style={styles.loading}><ActivityIndicator color="#890620" size="large" /></View>;
  }
  if (!isSignedIn) return <Redirect href="/" />;

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/settings');
  };

  const enableNotifications = async () => {
    if (isEnablingNotifications) return;
    setIsEnablingNotifications(true);
    setNotificationMessage(null);
    try {
      const granted = await requestJobNotificationPermission();
      setNotificationPermission(granted ? 'enabled' : 'disabled');
      if (!granted) {
        setNotificationMessage('Notifications are off. You can enable them in your device settings.');
        return;
      }
      const count = await syncJobNotifications(jobs ?? []);
      setNotificationMessage(count === 1
        ? '1 upcoming reminder is set on this device.'
        : `${count} upcoming reminders are set on this device.`);
    } catch {
      setNotificationMessage('Could not enable device reminders.');
    } finally {
      setIsEnablingNotifications(false);
    }
  };

  const cancelJob = async (job: AppJob) => {
    if (!apiUrl || cancellingJobId) return;
    setCancellingJobId(job.id);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Your session expired. Please sign in again.');
      const response = await fetch(`${apiUrl}/jobs/${encodeURIComponent(job.id)}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        let responseError = 'Could not cancel that job.';
        try {
          const body = (await response.json()) as { error?: unknown };
          if (typeof body.error === 'string') responseError = body.error;
        } catch {
          // Keep the generic error for an empty or non-JSON response.
        }
        throw new Error(responseError);
      }
      const nextJobs = (jobs ?? []).filter((candidate) => candidate.id !== job.id);
      setJobs(nextJobs);
      await syncJobNotifications(nextJobs);
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : 'Could not cancel that job.');
    } finally {
      setCancellingJobId(null);
    }
  };

  const confirmCancelJob = (job: AppJob) => {
    Alert.alert('cancel job?', `cbud will not run this ${jobTitle(job.type)} job.`, [
      { text: 'keep', style: 'cancel' },
      { text: 'cancel job', style: 'destructive', onPress: () => void cancelJob(job) },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.page}>
        <Text style={styles.wordmark}>cbud.</Text>
        <View style={styles.headingRow}>
          <Text style={styles.heading}>jobs</Text>
          {jobs !== null ? <Text style={styles.count}>{upcomingCount}</Text> : null}
        </View>
        <Text style={styles.intro}>cbud runs scheduled tasks and reminders, even when the app is closed.</Text>
        {billingStatus?.tier === 'free' ? <View style={styles.subscriptionCard}>
          <Text style={styles.notificationTitle}>class_bud required</Text>
          <Text style={styles.notificationText}>Scheduling new jobs requires class_bud. Your existing jobs remain available to inspect or cancel.</Text>
          <Pressable accessibilityLabel="View plans" onPress={() => router.push('/plans')}><Text style={styles.chatLink}>view plans</Text></Pressable>
        </View> : null}
        {billingError ? <Text accessibilityLiveRegion="polite" style={styles.error}>{billingError}</Text> : null}

        {notificationPermission !== 'unsupported' ? (
          <View style={styles.notificationCard}>
            <View style={styles.notificationCopy}>
              <Text style={styles.notificationTitle}>device reminders</Text>
              <Text style={styles.notificationText}>
                {notificationPermission === 'enabled'
                  ? 'on for reminders scheduled through cbud'
                  : 'turn on alerts for scheduled reminders'}
              </Text>
            </View>
            {notificationPermission !== 'enabled' ? (
              <Pressable
                accessibilityLabel="Enable reminder notifications"
                disabled={isEnablingNotifications || notificationPermission === 'loading'}
                onPress={() => void enableNotifications()}
                style={[styles.enableButton, (isEnablingNotifications || notificationPermission === 'loading') && styles.disabled]}
              >
                {isEnablingNotifications || notificationPermission === 'loading'
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.enableButtonText}>enable</Text>}
              </Pressable>
            ) : <Text style={styles.enabledMark}>✓</Text>}
          </View>
        ) : null}
        {notificationMessage ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notificationMessage}</Text> : null}

        {jobs === null ? (
          <View style={styles.centerState}>
            <ActivityIndicator color="#890620" size="large" />
            <Text style={styles.stateText}>loading jobs…</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl colors={['#890620']} onRefresh={() => void loadJobs(true)} refreshing={isRefreshing} tintColor="#890620" />}
            showsVerticalScrollIndicator
          >
            {sortedJobs.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>no jobs yet</Text>
                <Text style={styles.emptyText}>ask cbud in chat to do something later or schedule a reminder.</Text>
                <Pressable accessibilityRole="button" onPress={() => router.push('/home')}>
                  <Text style={styles.chatLink}>open chat →</Text>
                </Pressable>
              </View>
            ) : sortedJobs.map((job) => (
              <View key={job.id} style={styles.jobCard}>
                <View style={styles.jobHeading}>
                  <Text style={styles.jobTitle}>{jobTitle(job.type)}</Text>
                  <View style={styles.statusGroup}>
                    {job.status === 'running' ? <RunningGears /> : null}
                    <Text style={[styles.status, styles[`status_${job.status}`]]}>{job.status}</Text>
                  </View>
                </View>
                <Text style={styles.runAt}>{runLabel(job)}</Text>
                {job.message ? <Text style={styles.message}>{job.message}</Text> : null}
                {job.status === 'scheduled' ? (
                  <Pressable
                    accessibilityLabel={`Cancel ${jobTitle(job.type)} job`}
                    disabled={cancellingJobId !== null}
                    onPress={() => confirmCancelJob(job)}
                    style={[styles.cancelButton, cancellingJobId !== null && styles.disabled]}
                  >
                    {cancellingJobId === job.id
                      ? <ActivityIndicator color="#890620" size="small" />
                      : <Text style={styles.cancelText}>cancel</Text>}
                  </Pressable>
                ) : null}
              </View>
            ))}
            {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
          </ScrollView>
        )}

        <View style={styles.footer}>
          <Pressable accessibilityLabel="Refresh jobs" disabled={isRefreshing} onPress={() => void loadJobs(true)} style={[styles.refreshButton, isRefreshing && styles.disabled]}>
            {isRefreshing ? <ActivityIndicator color="#890620" size="small" /> : <Text style={styles.refreshText}>refresh</Text>}
          </Pressable>
          <Pressable accessibilityLabel="Go back" onPress={handleBack} style={styles.backButton}><Text style={styles.backText}>back</Text></Pressable>
        </View>
      </View>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#ebd4cb', flex: 1 },
  loading: { alignItems: 'center', backgroundColor: '#ebd4cb', flex: 1, justifyContent: 'center' },
  page: { flex: 1, gap: 14, padding: 28 },
  wordmark: { color: '#890620', fontSize: 38, fontWeight: '800', letterSpacing: -1.5, marginBottom: 10 },
  headingRow: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  heading: { color: '#2c0703', fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  count: { backgroundColor: '#890620', borderRadius: 12, color: '#fff', fontSize: 13, fontWeight: '700', minWidth: 24, overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 3, textAlign: 'center' },
  intro: { color: '#79534c', fontSize: 14, lineHeight: 20 },
  notificationCard: { alignItems: 'center', backgroundColor: '#e4c3b8', borderColor: '#c3978e', borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 12 },
  subscriptionCard: { backgroundColor: '#fff8f5', borderColor: '#cda49b', borderRadius: 14, borderWidth: 1, gap: 6, padding: 12 },
  notificationCopy: { flex: 1, gap: 2 },
  notificationTitle: { color: '#2c0703', fontSize: 14, fontWeight: '700' },
  notificationText: { color: '#79534c', fontSize: 12, lineHeight: 17 },
  enableButton: { alignItems: 'center', backgroundColor: '#890620', borderRadius: 10, justifyContent: 'center', minHeight: 38, minWidth: 72, paddingHorizontal: 12 },
  enableButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  enabledMark: { color: '#37734d', fontSize: 22, fontWeight: '800', paddingHorizontal: 8 },
  notice: { color: '#79534c', fontSize: 12, lineHeight: 17, textAlign: 'center' },
  centerState: { alignItems: 'center', flex: 1, gap: 12, justifyContent: 'center' },
  stateText: { color: '#79534c', fontSize: 14 },
  list: { gap: 10, paddingBottom: 8 },
  emptyCard: { alignItems: 'center', backgroundColor: '#fff8f5', borderColor: '#cda49b', borderRadius: 16, borderWidth: 1, gap: 7, padding: 24 },
  emptyTitle: { color: '#2c0703', fontSize: 17, fontWeight: '700' },
  emptyText: { color: '#79534c', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  chatLink: { color: '#890620', fontSize: 14, fontWeight: '700', padding: 6 },
  jobCard: { backgroundColor: '#fff8f5', borderColor: '#cda49b', borderRadius: 16, borderWidth: 1, gap: 7, padding: 16 },
  jobHeading: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  statusGroup: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  jobTitle: { color: '#2c0703', flex: 1, fontSize: 17, fontWeight: '700' },
  status: { borderRadius: 10, fontSize: 11, fontWeight: '800', overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 4, textTransform: 'uppercase' },
  status_scheduled: { backgroundColor: '#ead0ca', color: '#890620' },
  status_running: { backgroundColor: '#f2ddaa', color: '#744b00' },
  status_completed: { backgroundColor: '#d7eadc', color: '#386641' },
  status_failed: { backgroundColor: '#f4d2ce', color: '#9d2017' },
  runAt: { color: '#890620', fontSize: 13, fontWeight: '700' },
  message: { color: '#79534c', fontSize: 14, lineHeight: 20 },
  cancelButton: { alignItems: 'center', alignSelf: 'flex-start', borderColor: '#890620', borderRadius: 9, borderWidth: 1, justifyContent: 'center', marginTop: 4, minHeight: 34, minWidth: 74, paddingHorizontal: 12 },
  cancelText: { color: '#890620', fontSize: 13, fontWeight: '700' },
  error: { color: '#890620', fontSize: 13, lineHeight: 18, textAlign: 'center' },
  footer: { gap: 8, marginTop: 'auto' },
  refreshButton: { alignItems: 'center', borderColor: '#890620', borderRadius: 12, borderWidth: 1, justifyContent: 'center', minHeight: 48 },
  refreshText: { color: '#890620', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.55 },
  backButton: { alignItems: 'center', backgroundColor: '#890620', borderRadius: 12, paddingVertical: 16 },
  backText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

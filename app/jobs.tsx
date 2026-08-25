import { useAuth } from '@clerk/expo';
import { Redirect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type AppJob = {
  id: string;
  type: 'refresh_assignments' | 'remind_user';
  status: 'scheduled' | 'running' | 'completed' | 'failed';
  runAt: string;
  message: string | null;
};

const apiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

function isAppJob(value: unknown): value is AppJob {
  if (!value || typeof value !== 'object') return false;
  const job = value as Partial<AppJob>;
  return (
    typeof job.id === 'string' &&
    (job.type === 'refresh_assignments' || job.type === 'remind_user') &&
    ['scheduled', 'running', 'completed', 'failed'].includes(job.status ?? '') &&
    typeof job.runAt === 'string' &&
    (job.message === null || typeof job.message === 'string')
  );
}

function jobTitle(type: AppJob['type']): string {
  return type === 'refresh_assignments' ? 'refresh assignments' : 'reminder';
}

function runLabel(runAt: string): string {
  const date = new Date(runAt);
  if (Number.isNaN(date.getTime())) return 'schedule unavailable';
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export default function JobsPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const hasLoadedOnArrival = useRef(false);
  const [jobs, setJobs] = useState<AppJob[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadJobs = useCallback(async (refreshing = false) => {
    if (!apiUrl) {
      setError('Set EXPO_PUBLIC_API_URL to connect cbud to the API.');
      setJobs([]);
      return;
    }
    if (refreshing) setIsRefreshing(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('Your session expired. Please sign in again.');
      const response = await fetch(`${apiUrl}/jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await response.json()) as { jobs?: unknown; error?: unknown };
      if (!response.ok || !Array.isArray(body.jobs)) {
        throw new Error(typeof body.error === 'string' ? body.error : 'Could not load jobs.');
      }
      setJobs(body.jobs.filter(isAppJob));
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

  if (!isLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#890620" size="large" />
      </View>
    );
  }
  if (!isSignedIn) return <Redirect href="/" />;

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/settings');
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.page}>
        <Text style={styles.wordmark}>cbud.</Text>
        <View style={styles.headingRow}>
          <Text style={styles.heading}>jobs</Text>
          {jobs ? <Text style={styles.count}>{jobs.length}</Text> : null}
        </View>
        <Text style={styles.intro}>
          jobs let cbud hold onto scheduled assignment refreshes and reminders. background execution and notifications are the next step.
        </Text>

        {jobs === null ? (
          <View style={styles.centerState}>
            <ActivityIndicator color="#890620" size="large" />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator>
            {jobs.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>no jobs yet</Text>
                <Text style={styles.emptyText}>ask cbud to schedule a reminder or assignment refresh.</Text>
              </View>
            ) : jobs.map((job) => (
              <View key={job.id} style={styles.jobCard}>
                <View style={styles.jobHeading}>
                  <Text style={styles.jobTitle}>{jobTitle(job.type)}</Text>
                  <Text style={styles.status}>{job.status}</Text>
                </View>
                <Text style={styles.runAt}>{runLabel(job.runAt)}</Text>
                {job.message ? <Text style={styles.message}>{job.message}</Text> : null}
              </View>
            ))}
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>
        )}

        <View style={styles.footer}>
          <Pressable
            accessibilityLabel="Refresh jobs"
            disabled={isRefreshing}
            onPress={() => void loadJobs(true)}
            style={[styles.refreshButton, isRefreshing && styles.disabled]}
          >
            {isRefreshing
              ? <ActivityIndicator color="#890620" size="small" />
              : <Text style={styles.refreshText}>refresh</Text>}
          </Pressable>
          <Pressable accessibilityLabel="Go back" onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backText}>back</Text>
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
  page: { flex: 1, gap: 16, padding: 28 },
  wordmark: { color: '#890620', fontSize: 38, fontWeight: '800', letterSpacing: -1.5, marginBottom: 18 },
  headingRow: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  heading: { color: '#2c0703', fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  count: { backgroundColor: '#890620', borderRadius: 12, color: '#fff', fontSize: 13, fontWeight: '700', minWidth: 24, overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 3, textAlign: 'center' },
  intro: { color: '#79534c', fontSize: 14, lineHeight: 20 },
  centerState: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  list: { gap: 10, paddingBottom: 8 },
  emptyCard: { alignItems: 'center', backgroundColor: '#fff8f5', borderColor: '#cda49b', borderRadius: 16, borderWidth: 1, gap: 7, padding: 24 },
  emptyTitle: { color: '#2c0703', fontSize: 17, fontWeight: '700' },
  emptyText: { color: '#79534c', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  jobCard: { backgroundColor: '#fff8f5', borderColor: '#cda49b', borderRadius: 16, borderWidth: 1, gap: 7, padding: 16 },
  jobHeading: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  jobTitle: { color: '#2c0703', flex: 1, fontSize: 17, fontWeight: '700' },
  status: { backgroundColor: '#ead0ca', borderRadius: 10, color: '#890620', fontSize: 11, fontWeight: '800', overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 4, textTransform: 'uppercase' },
  runAt: { color: '#890620', fontSize: 13, fontWeight: '700' },
  message: { color: '#79534c', fontSize: 14, lineHeight: 20 },
  error: { color: '#890620', fontSize: 13, textAlign: 'center' },
  footer: { gap: 8, marginTop: 'auto' },
  refreshButton: { alignItems: 'center', borderColor: '#890620', borderRadius: 12, borderWidth: 1, minHeight: 48, justifyContent: 'center' },
  refreshText: { color: '#890620', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.55 },
  backButton: { alignItems: 'center', backgroundColor: '#890620', borderRadius: 12, paddingVertical: 16 },
  backText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

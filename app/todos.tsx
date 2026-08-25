import { useAuth } from '@clerk/expo';
import { Redirect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type DetectedAssignment = {
  memoryKey: string;
  canvasAssignmentId: number | null;
  title: string;
  course: string | null;
  dueAt: string | null;
  submitted: boolean | null;
};

const apiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

function isDetectedAssignment(value: unknown): value is DetectedAssignment {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<DetectedAssignment>;
  return (
    typeof candidate.memoryKey === 'string' &&
    typeof candidate.title === 'string' &&
    (candidate.course === null || typeof candidate.course === 'string') &&
    (candidate.dueAt === null || typeof candidate.dueAt === 'string') &&
    (candidate.submitted === null || typeof candidate.submitted === 'boolean')
  );
}

function dueLabel(dueAt: string | null): string {
  if (!dueAt) return 'no due date';
  const dueDate = new Date(dueAt);
  if (Number.isNaN(dueDate.getTime())) return 'due date unavailable';

  return `due ${new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(dueDate)}`;
}

function assignmentOrder(left: DetectedAssignment, right: DetectedAssignment): number {
  if (!left.dueAt && !right.dueAt) return left.title.localeCompare(right.title);
  if (!left.dueAt) return 1;
  if (!right.dueAt) return -1;
  return left.dueAt.localeCompare(right.dueAt);
}

export default function TodosPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [assignments, setAssignments] = useState<DetectedAssignment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadAssignments = useCallback(async (refreshing = false) => {
    if (!apiUrl) {
      setError('Set EXPO_PUBLIC_API_URL to connect cbud to the API.');
      setAssignments([]);
      return;
    }

    if (refreshing) setIsRefreshing(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('Your session expired. Please sign in again.');

      const response = await fetch(`${apiUrl}/assignments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await response.json()) as { assignments?: unknown; error?: unknown };
      if (!response.ok || !Array.isArray(body.assignments)) {
        throw new Error(typeof body.error === 'string' ? body.error : 'Could not load assignments.');
      }

      setAssignments(body.assignments.filter(isDetectedAssignment));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load assignments.');
      setAssignments((current) => current ?? []);
    } finally {
      if (refreshing) setIsRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const frame = requestAnimationFrame(() => void loadAssignments());
    return () => cancelAnimationFrame(frame);
  }, [isLoaded, isSignedIn, loadAssignments]);

  const todos = useMemo(
    () => (assignments ?? []).filter((assignment) => assignment.submitted !== true).sort(assignmentOrder),
    [assignments],
  );

  if (!isLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#890620" />
      </View>
    );
  }

  if (!isSignedIn) return <Redirect href="/" />;

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/settings');
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.page}>
        <Text style={styles.wordmark}>cbud</Text>
        <View style={styles.headingRow}>
          <Text style={styles.heading}>to do&apos;s</Text>
          {assignments !== null ? <Text style={styles.count}>{todos.length}</Text> : null}
        </View>

        {assignments === null ? (
          <View style={styles.centerState}>
            <ActivityIndicator color="#890620" size="large" />
            <Text style={styles.stateText}>loading detected assignments…</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator>
            {todos.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>nothing detected yet</Text>
                <Text style={styles.emptyText}>ask cbud about your upcoming assignments, then refresh this page.</Text>
              </View>
            ) : (
              todos.map((assignment) => (
                <View key={assignment.memoryKey} style={styles.assignmentCard}>
                  {assignment.course ? <Text style={styles.course}>{assignment.course}</Text> : null}
                  <Text style={styles.assignmentTitle}>{assignment.title}</Text>
                  <Text style={styles.due}>{dueLabel(assignment.dueAt)}</Text>
                </View>
              ))
            )}
            {error ? (
              <Text accessibilityLiveRegion="polite" style={styles.errorText}>{error}</Text>
            ) : null}
          </ScrollView>
        )}

        <View style={styles.actions}>
          <Pressable
            accessibilityLabel="Refresh detected assignments"
            disabled={isRefreshing}
            onPress={() => void loadAssignments(true)}
            style={[styles.secondaryButton, isRefreshing && styles.buttonDisabled]}
          >
            {isRefreshing ? (
              <ActivityIndicator color="#890620" size="small" />
            ) : (
              <Text style={styles.secondaryButtonText}>refresh</Text>
            )}
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
  centerState: { alignItems: 'center', flex: 1, gap: 12, justifyContent: 'center' },
  stateText: { color: '#79534c', fontSize: 14 },
  list: { gap: 10, paddingBottom: 8 },
  assignmentCard: { backgroundColor: '#fff8f5', borderColor: '#cda49b', borderRadius: 16, borderWidth: 1, gap: 6, padding: 16 },
  course: { color: '#890620', fontSize: 12, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
  assignmentTitle: { color: '#2c0703', fontSize: 17, fontWeight: '700', lineHeight: 22 },
  due: { color: '#79534c', fontSize: 14 },
  emptyCard: { alignItems: 'center', backgroundColor: '#fff8f5', borderColor: '#cda49b', borderRadius: 16, borderWidth: 1, gap: 7, padding: 24 },
  emptyTitle: { color: '#2c0703', fontSize: 17, fontWeight: '700' },
  emptyText: { color: '#79534c', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  errorText: { color: '#890620', fontSize: 13, lineHeight: 18, textAlign: 'center' },
  actions: { gap: 8, marginTop: 'auto' },
  secondaryButton: { alignItems: 'center', borderColor: '#890620', borderRadius: 12, borderWidth: 1, minHeight: 48, justifyContent: 'center', paddingHorizontal: 16 },
  secondaryButtonText: { color: '#890620', fontSize: 16, fontWeight: '700' },
  buttonDisabled: { opacity: 0.55 },
  backButton: { alignItems: 'center', backgroundColor: '#890620', borderRadius: 12, paddingVertical: 16 },
  backText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

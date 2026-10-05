import { useAuth, useUser } from '@clerk/expo';
import { fetch as expoFetch } from 'expo/fetch';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Markdown from 'react-native-markdown-renderer';

import { BUDDY_BASE_SIZE, Buddy, getResponsiveBuddySize } from '../components/buddy';
import { subscribeToAccountDataCleared } from '../lib/account-data-events';
import { getResponsiveControlScale } from '../lib/responsive-layout';

type ChatTextMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type AssignmentChatItem = {
  id: string;
  role: 'assignment';
  title: string;
  dueAt: string | null;
  htmlUrl: string | null;
};

type CompletionActivityItem = {
  id: string;
  role: 'activity';
  round: number;
  state: 'active' | 'complete' | 'failed';
  toolNames: string[];
};

type ChatItem = ChatTextMessage | AssignmentChatItem | CompletionActivityItem;

type ChatStreamPayload = {
  assignmentId?: unknown;
  code?: unknown;
  conversationId?: unknown;
  dueAt?: unknown;
  error?: unknown;
  htmlUrl?: unknown;
  message?: unknown;
  round?: unknown;
  state?: unknown;
  text?: unknown;
  title?: unknown;
  toolNames?: unknown;
};

const apiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

function getDeviceTimeContext() {
  const now = new Date();
  let timeZone: string | null = null;
  try {
    const resolvedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (typeof resolvedTimeZone === 'string' && resolvedTimeZone) timeZone = resolvedTimeZone;
  } catch {
    // The numeric offset still gives the backend usable local-time context.
  }

  return {
    now: now.toISOString(),
    timeZone,
    utcOffsetMinutes: -now.getTimezoneOffset(),
  };
}

function markdownStyles(color: string, mutedColor: string, codeBackground: string, fontScale: number) {
  return {
    root: { color, gap: 7 * fontScale },
    text: { color, fontSize: 16 * fontScale, lineHeight: 22 * fontScale },
    paragraph: { marginBottom: 0, marginTop: 0 },
    headingContainer: { marginBottom: 0, marginTop: 0 },
    heading: { color, fontWeight: '700' as const },
    heading1: { fontSize: 21 * fontScale, lineHeight: 27 * fontScale },
    heading1Container: { borderBottomWidth: 0, paddingBottom: 0 },
    heading2: { fontSize: 19 * fontScale, lineHeight: 25 * fontScale },
    heading2Container: { borderBottomWidth: 0, paddingBottom: 0 },
    heading3: { fontSize: 17 * fontScale, lineHeight: 23 * fontScale },
    heading4: { fontSize: 16 * fontScale, lineHeight: 22 * fontScale },
    heading5: { fontSize: 16 * fontScale, lineHeight: 22 * fontScale },
    heading6: { fontSize: 16 * fontScale, lineHeight: 22 * fontScale },
    list: { marginBottom: 0 },
    listUnorderedItem: { marginTop: 2 },
    listOrderedItem: { marginTop: 2 },
    listUnorderedItemIcon: { color, lineHeight: 22 * fontScale, marginLeft: 4, marginRight: 8 },
    listUnorderedItemText: { color, fontSize: 16 * fontScale, lineHeight: 22 * fontScale },
    listOrderedItemIcon: { color, lineHeight: 22 * fontScale, marginLeft: 4, marginRight: 8 },
    listOrderedItemText: { color, fontSize: 16 * fontScale, lineHeight: 22 * fontScale },
    link: { color: mutedColor, textDecorationLine: 'underline' as const },
    blocklink: { borderBottomColor: mutedColor },
    blockquote: { borderLeftColor: mutedColor, marginBottom: 0, paddingHorizontal: 10 },
    codeInline: { backgroundColor: codeBackground, color, fontSize: 14 * fontScale },
    codeBlock: { backgroundColor: codeBackground, color, fontSize: 14 * fontScale, lineHeight: 20 * fontScale, marginBottom: 0, padding: 10 },
    pre: { marginBottom: 0 },
    hr: { backgroundColor: mutedColor, height: 1, marginBottom: 0, marginTop: 0 },
    table: { borderColor: mutedColor, marginBottom: 0 },
    tableHeader: { backgroundColor: codeBackground },
    tableHeaderCell: { borderColor: mutedColor, color },
    tableRow: { borderColor: mutedColor },
    tableRowCell: { borderColor: mutedColor, color },
  };
}

function ChatBubble({ controlScale, message }: { controlScale: number; message: ChatTextMessage }) {
  const [entrance] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.spring(entrance, {
      damping: 16,
      mass: 0.7,
      stiffness: 180,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  const isUser = message.role === 'user';
  const markdownStyle = useMemo(
    () => isUser
      ? markdownStyles('#2c0703', '#890620', '#f4e3de', controlScale)
      : markdownStyles('#fff', '#ffd6de', 'rgba(255, 255, 255, 0.14)', controlScale),
    [controlScale, isUser],
  );

  const bubble = (
    <Animated.View
      style={[
        styles.bubble,
        isUser ? styles.userBubble : styles.assistantBubble,
        {
          paddingHorizontal: 15 * controlScale,
          paddingVertical: 11 * controlScale,
          opacity: entrance,
          transform: [
            { translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
            { scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
          ],
        },
      ]}
    >
      <Markdown
        allowedImageHandlers={[]}
        defaultImageHandler={null}
        style={markdownStyle}
      >
        {message.content}
      </Markdown>
    </Animated.View>
  );

  return bubble;
}

function assignmentDueLabel(dueAt: string | null): string {
  if (!dueAt) return 'no due date';
  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) return 'due date unavailable';
  return `due ${new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)}`;
}

function AssignmentCard({ assignment, controlScale }: { assignment: AssignmentChatItem; controlScale: number }) {
  const router = useRouter();
  const [entrance] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.spring(entrance, {
      damping: 13,
      mass: 0.65,
      stiffness: 210,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  return (
    <Animated.View
      accessibilityLabel={`${assignment.title}, ${assignmentDueLabel(assignment.dueAt)}`}
      style={[
        styles.assignmentCard,
        {
          opacity: entrance,
          transform: [
            { translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
            { scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) },
          ],
        },
      ]}
    >
      <View style={styles.assignmentCardRow}>
        <View style={styles.assignmentCardCopy}>
          <Text style={[styles.assignmentCardTitle, { fontSize: 16 * controlScale, lineHeight: 21 * controlScale }]}>{assignment.title}</Text>
          <Text style={[styles.assignmentCardDue, { fontSize: 12 * controlScale, lineHeight: 16 * controlScale }]}>{assignmentDueLabel(assignment.dueAt)}</Text>
        </View>
        <Pressable
          accessibilityLabel={`View ${assignment.title} in To Do's`}
          accessibilityRole="link"
          hitSlop={8}
          onPress={() => router.push({ pathname: '/todos', params: { refresh: 'true' } })}
          style={({ pressed }) => [
            styles.assignmentLink,
            {
              borderRadius: 17 * controlScale,
              height: 34 * controlScale,
              width: 34 * controlScale,
            },
            pressed && styles.assignmentLinkPressed,
          ]}
        >
          <Text style={[styles.assignmentLinkIcon, { fontSize: 18 * controlScale, lineHeight: 20 * controlScale }]}>→</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const toolActivityLabels: Record<string, string> = {
  get_my_submission: 'checked submission',
  get_my_submission_status: 'checked submission status',
  list_assignments: 'checked assignments',
  get_my_enrollments: 'checked courses',
  get_my_upcoming_assignments: 'checked upcoming assignments',
  get_my_todo_items: 'checked canvas to do items',
  create_job: 'scheduled a job',
  list_jobs: 'checked jobs',
  cancel_job: 'cancelled a job',
};

function CompletionActivity({ activity, controlScale }: { activity: CompletionActivityItem; controlScale: number }) {
  const label = activity.state === 'failed'
    ? `stopped · step ${activity.round + 1}`
    : activity.state === 'active'
    ? `thinking · step ${activity.round + 1}`
    : activity.toolNames.length > 0
      ? `${activity.toolNames.map((name) => toolActivityLabels[name] ?? name.replaceAll('_', ' ')).join(', ')} · step ${activity.round + 1}`
      : `finished thinking · step ${activity.round + 1}`;

  return (
    <View accessibilityLabel={label} style={styles.completionActivity}>
      {activity.state === 'active' ? (
        <ActivityIndicator color="#890620" size="small" />
      ) : (
        <Text style={[styles.completionActivityCheck, { fontSize: 14 * controlScale, width: 14 * controlScale }]}>{activity.state === 'failed' ? '!' : '✓'}</Text>
      )}
      <Text style={[styles.completionActivityText, { fontSize: 13 * controlScale, lineHeight: 18 * controlScale }]}>{label}</Text>
    </View>
  );
}

export default function HomePage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const listRef = useRef<FlatList<ChatItem>>(null);
  const hasLoadedHistory = useRef(false);
  const historyRequest = useRef<AbortController | null>(null);
  const isSendingRef = useRef(false);
  const getTokenRef = useRef(getToken);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monthlyLimitReached, setMonthlyLimitReached] = useState(false);
  const [isCanvasConnected, setIsCanvasConnected] = useState<boolean | null>(null);
  const buddySize = getResponsiveBuddySize(screenWidth, screenHeight);
  const buddyScale = buddySize / BUDDY_BASE_SIZE;
  const controlScale = getResponsiveControlScale(screenWidth, screenHeight);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: messages.length > 1 }));
  }, [messages.length]);

  useEffect(() => subscribeToAccountDataCleared(() => {
    setMessages([]);
    setConversationId(null);
    hasLoadedHistory.current = false;
    setError(null);
  }), []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !apiUrl) {
      return;
    }

    const controller = new AbortController();
    const frame = requestAnimationFrame(() => {
      void (async () => {
        try {
          const token = await getToken();
          if (!token) {
            return;
          }

          const response = await fetch(`${apiUrl}/integrations/canvas`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          });
          const body = (await response.json()) as { connected?: unknown };
          if (response.ok && typeof body.connected === 'boolean') {
            setIsCanvasConnected(body.connected);
          }
        } catch (statusError) {
          if (!(statusError instanceof Error && statusError.name === 'AbortError')) {
            console.warn('Could not load Canvas connection status');
          }
        }
      })();
    });

    return () => {
      cancelAnimationFrame(frame);
      controller.abort();
    };
  }, [getToken, isLoaded, isSignedIn]);

  useFocusEffect(useCallback(() => {
    if (!isLoaded || !isSignedIn || !apiUrl || isSendingRef.current) {
      return;
    }

    const controller = new AbortController();
    historyRequest.current = controller;
    void (async () => {
      try {
        const token = await getTokenRef.current();
        if (!token) return;
        const response = await fetch(`${apiUrl}/chat/history`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const body = (await response.json()) as {
          conversationId?: unknown;
          messages?: unknown;
        };
        if (
          controller.signal.aborted ||
          isSendingRef.current ||
          !response.ok ||
          typeof body.conversationId !== 'string' ||
          !Array.isArray(body.messages)
        ) return;

        const restored = body.messages.filter((candidate): candidate is ChatItem => {
          if (!candidate || typeof candidate !== 'object') return false;
          const value = candidate as {
            content?: unknown;
            dueAt?: unknown;
            htmlUrl?: unknown;
            id?: unknown;
            role?: unknown;
            title?: unknown;
          };
          if (value.role === 'assignment') {
            return (
              typeof value.id === 'string' &&
              typeof value.title === 'string' &&
              (value.dueAt === null || typeof value.dueAt === 'string') &&
              (value.htmlUrl === null || typeof value.htmlUrl === 'string')
            );
          }
          return (
            typeof value.id === 'string' &&
            (value.role === 'user' || value.role === 'assistant') &&
            typeof value.content === 'string'
          );
        });
        setConversationId(body.conversationId);
        setMessages((current) => hasLoadedHistory.current
          ? restored
          : current.length === 0 ? restored : current);
        hasLoadedHistory.current = true;
      } catch (historyError) {
        if (!(historyError instanceof Error && historyError.name === 'AbortError')) {
          console.warn('Could not load chat history');
        }
      } finally {
        if (historyRequest.current === controller) historyRequest.current = null;
      }
    })();

    return () => {
      controller.abort();
      if (historyRequest.current === controller) historyRequest.current = null;
    };
  }, [isLoaded, isSignedIn]));

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

  const handleSend = async () => {
    const content = message.trim();

    if (!content || isSendingRef.current) {
      return;
    }

    isSendingRef.current = true;
    historyRequest.current?.abort();
    historyRequest.current = null;
    const turnId = Date.now();
    const assistantMessageId = `${turnId}-assistant`;
    const userMessage: ChatTextMessage = { id: `${turnId}-user`, role: 'user', content };
    setMessages((current) => [...current, userMessage]);
    setMessage('');
    setError(null);
    setMonthlyLimitReached(false);
    setIsSending(true);

    try {
      if (!apiUrl) {
        throw new Error('Set EXPO_PUBLIC_API_URL to connect cbud to the API.');
      }

      const token = await getToken();

      if (!token) {
        throw new Error('Your session expired. Please sign in again.');
      }

      const chatResponse = await expoFetch(`${apiUrl}/chat/stream`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'text/event-stream',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          deviceTime: getDeviceTimeContext(),
          ...(conversationId ? { conversationId } : {}),
        }),
      });
      if (!chatResponse.ok) {
        const body = await chatResponse.json().catch(() => null) as ChatStreamPayload | null;
        if (body?.code === 'monthly_limit_reached') setMonthlyLimitReached(true);
        throw new Error(typeof body?.error === 'string' ? body.error : 'cbud could not reply.');
      }
      if (!chatResponse.body) {
        throw new Error('cbud returned no response stream.');
      }

      const reader = chatResponse.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let receivedDone = false;

      const updateAssistant = (text: string, replace = false) => {
        setMessages((current) => {
          const existingIndex = current.findIndex((item) => item.id === assistantMessageId);
          if (existingIndex < 0) {
            return [...current, { id: assistantMessageId, role: 'assistant', content: text }];
          }

          const updated = [...current];
          const existing = updated[existingIndex];
          if (existing.role !== 'assistant') return current;
          updated[existingIndex] = {
            ...existing,
            content: replace ? text : existing.content + text,
          };
          return updated;
        });
      };

      const processEvent = (rawEvent: string) => {
        let event = 'message';
        const dataLines: string[] = [];
        for (const line of rawEvent.split(/\r?\n/)) {
          if (line.startsWith('event:')) event = line.slice(6).trim();
          if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
        }
        if (dataLines.length === 0) return;

        const payload = JSON.parse(dataLines.join('\n')) as ChatStreamPayload;
        if (event === 'start' && typeof payload.conversationId === 'string') {
          setConversationId(payload.conversationId);
        } else if (
          event === 'activity' &&
          typeof payload.round === 'number' &&
          Number.isSafeInteger(payload.round) &&
          payload.round >= 0 &&
          (payload.state === 'active' || payload.state === 'complete') &&
          (payload.toolNames === undefined ||
            (Array.isArray(payload.toolNames) && payload.toolNames.every((name) => typeof name === 'string')))
        ) {
          const activityId = `${turnId}-activity-${payload.round}`;
          const toolNames = Array.isArray(payload.toolNames) ? payload.toolNames as string[] : [];
          setMessages((current) => {
            const existingIndex = current.findIndex((item) => item.id === activityId);
            const activity: CompletionActivityItem = {
              id: activityId,
              role: 'activity',
              round: payload.round as number,
              state: payload.state as 'active' | 'complete',
              toolNames,
            };
            if (existingIndex < 0) return [...current, activity];
            const updated = [...current];
            updated[existingIndex] = activity;
            return updated;
          });
        } else if (event === 'delta' || event === 'reset') {
          // Draft output stays represented by the persistent activity line until
          // the server sends the final assistant message.
        } else if (
          event === 'assignment' &&
          typeof payload.assignmentId === 'string' &&
          typeof payload.title === 'string' &&
          (payload.dueAt === null || typeof payload.dueAt === 'string') &&
          (payload.htmlUrl === null || typeof payload.htmlUrl === 'string')
        ) {
          const assignmentId = `${turnId}-assignment-${payload.assignmentId}`;
          setMessages((current) => current.some((item) => item.id === assignmentId)
            ? current
            : [...current, {
                id: assignmentId,
                role: 'assignment',
                title: payload.title as string,
                dueAt: payload.dueAt as string | null,
                htmlUrl: payload.htmlUrl as string | null,
              }]);
        } else if (event === 'done') {
          if (typeof payload.conversationId !== 'string' || typeof payload.message !== 'string') {
            throw new Error('cbud returned an invalid conversation.');
          }
          setConversationId(payload.conversationId);
          updateAssistant(payload.message, true);
          receivedDone = true;
        } else if (event === 'error') {
          if (payload.code === 'monthly_limit_reached') setMonthlyLimitReached(true);
          throw new Error(typeof payload.error === 'string' ? payload.error : 'cbud could not reply.');
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });

        let separator = buffer.match(/\r?\n\r?\n/);
        while (separator?.index !== undefined) {
          const event = buffer.slice(0, separator.index);
          buffer = buffer.slice(separator.index + separator[0].length);
          processEvent(event);
          separator = buffer.match(/\r?\n\r?\n/);
        }

        if (done) break;
      }

      if (buffer.trim()) processEvent(buffer);
      if (!receivedDone) throw new Error('cbud response ended unexpectedly.');

    } catch (sendError) {
      setMessages((current) => current.filter((item) => item.id !== assistantMessageId));
      setMessages((current) => current.map((item) => item.role === 'activity' && item.state === 'active'
        ? { ...item, state: 'failed' as const, toolNames: [] }
        : item));
      setError(sendError instanceof Error ? sendError.message : 'cbud could not reply.');
    } finally {
      isSendingRef.current = false;
      setIsSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>
        <View style={styles.portal}>
          {isCanvasConnected === false ? (
            <Pressable
              accessibilityLabel="Canvas integration not enabled. Open settings."
              onPress={() => router.push('/preferences')}
              style={[
                styles.canvasWarning,
                {
                  borderRadius: 10 * controlScale,
                  gap: 10 * controlScale,
                  paddingHorizontal: 14 * controlScale,
                  paddingVertical: 12 * controlScale,
                },
              ]}
            >
              <Text style={[styles.canvasWarningIcon, { fontSize: 17 * controlScale }]}>!</Text>
              <Text style={[styles.canvasWarningText, { fontSize: 14 * controlScale }]}>
                canvas integration not enabled. {"\n"}go to <Text style={styles.canvasWarningLink}>settings</Text>
              </Text>
            </Pressable>
          ) : null}
          <View style={styles.chatArea}>
            <View style={styles.chatWindow}>
              {messages.length === 0 ? (
                <View style={styles.introCopy}>
                  <Text style={styles.heading}>hey!{user?.firstName ? `, ${user.firstName.toLowerCase()}` : ''}</Text>
                  <Text style={styles.copy}>{isSending ? 'thinking…' : 'what are we up to today?'}</Text>
                </View>
              ) : (
                <FlatList
                  contentContainerStyle={styles.messagesContent}
                  data={messages}
                  keyboardShouldPersistTaps="handled"
                  keyExtractor={(item) => item.id}
                  onContentSizeChange={() => requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }))}
                  onLayout={() => requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: false }))}
                  ref={listRef}
                  renderItem={({ item }) => item.role === 'assignment'
                    ? <AssignmentCard assignment={item} controlScale={controlScale} />
                    : item.role === 'activity'
                      ? <CompletionActivity activity={item} controlScale={controlScale} />
                      : <ChatBubble controlScale={controlScale} message={item} />}
                  scrollEnabled
                  showsVerticalScrollIndicator
                  style={styles.messages}
                />
              )}
            </View>
            {error ? (
              <View style={styles.errorOverlay}>
                <Text accessibilityLiveRegion="polite" style={styles.errorText}>{error}</Text>
                {monthlyLimitReached ? <Pressable accessibilityLabel="View plans" onPress={() => router.push('/plans')}><Text style={styles.plansLink}>view plans</Text></Pressable> : null}
              </View>
            ) : null}
          </View>
          <View style={[styles.composer, { gap: 10 * controlScale }]}>
            <Pressable
              accessibilityLabel="Open menu"
              onPress={() => router.push('/settings')}
              style={[
                styles.iconButton,
                {
                  borderRadius: 22 * controlScale,
                  height: 44 * controlScale,
                  width: 44 * controlScale,
                },
              ]}
            >
              <Text style={[styles.menu, { fontSize: 22 * controlScale, lineHeight: 25 * controlScale }]}>☰</Text>
            </Pressable>
            <TextInput
              accessibilityLabel="Message"
              editable={!isSending}
              onChangeText={setMessage}
              onSubmitEditing={() => void handleSend()}
              placeholder="Message cbud..."
              placeholderTextColor="#8f6e67"
              returnKeyType="send"
              style={[
                styles.input,
                {
                  borderRadius: 22 * controlScale,
                  fontSize: 16 * controlScale,
                  height: 44 * controlScale,
                  paddingHorizontal: 16 * controlScale,
                },
              ]}
              value={message}
            />
            <Pressable
              accessibilityLabel="Send message"
              disabled={!message.trim() || isSending}
              onPress={() => void handleSend()}
              style={[
                styles.iconButton,
                {
                  borderRadius: 22 * controlScale,
                  height: 44 * controlScale,
                  width: 44 * controlScale,
                },
                (!message.trim() || isSending) && styles.iconButtonDisabled,
              ]}
            >
              {isSending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={[styles.arrow, { fontSize: 24 * controlScale, lineHeight: 26 * controlScale }]}>↑</Text>}
            </Pressable>
          </View>
          <View pointerEvents="none" style={styles.buddySection}>
            <Buddy animation={isSending ? 'thinking' : 'idle'} animationKey={messages.length} size={buddySize} />
            <Text
              style={[
                styles.buddyWordmark,
                {
                  bottom: 23 * buddyScale,
                  fontSize: 28 * buddyScale,
                  left: 2 * buddyScale,
                  letterSpacing: -buddyScale,
                },
              ]}
            >
              cbud.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#ebd4cb', flex: 1 },
  loading: { alignItems: 'center', backgroundColor: '#ebd4cb', flex: 1, justifyContent: 'center' },
  keyboardView: { flex: 1 },
  portal: { flex: 1, gap: 12, padding: 20 },
  canvasWarning: { alignItems: 'center', backgroundColor: '#890620', borderColor: '#890620', borderLeftWidth: 4, borderWidth: 1, flexDirection: 'row' },
  canvasWarningIcon: { color: '#fff', fontWeight: '800' },
  canvasWarningText: { color: '#fff', flex: 1, fontWeight: '700' },
  canvasWarningLink: { textDecorationLine: 'underline' },
  chatArea: { flex: 1, position: 'relative' },
  chatWindow: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  introCopy: { flex: 1, justifyContent: 'center' },
  heading: { color: '#2c0703', fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  copy: { color: '#890620', fontSize: 16, lineHeight: 23, marginBottom: 10 },
  messages: { flex: 1 },
  messagesContent: { gap: 10, paddingBottom: 18, paddingTop: 8 },
  bubble: { borderRadius: 18, maxWidth: '84%' },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#fff8f5', borderBottomRightRadius: 5 },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: '#890620', borderBottomLeftRadius: 5 },
  completionActivity: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: 7, minHeight: 24, paddingHorizontal: 3 },
  completionActivityCheck: { color: '#890620', fontWeight: '800' },
  completionActivityText: { color: '#79534c', fontStyle: 'italic' },
  assignmentCard: { alignSelf: 'stretch', backgroundColor: '#fff8f5', borderColor: '#890620', borderRadius: 14, borderWidth: 1, paddingHorizontal: 15, paddingVertical: 12 },
  assignmentCardRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  assignmentCardCopy: { flex: 1, gap: 4 },
  assignmentCardTitle: { color: '#2c0703', fontWeight: '700' },
  assignmentCardDue: { color: '#79534c' },
  assignmentLink: { alignItems: 'center', backgroundColor: '#890620', justifyContent: 'center' },
  assignmentLinkPressed: { opacity: 0.7 },
  assignmentLinkIcon: { color: '#fff', fontWeight: '800' },
  buddySection: { alignItems: 'center', transform: [{ translateY: 24 }] },
  buddyWordmark: { color: '#890620', fontWeight: '800', position: 'absolute' },
  errorOverlay: { alignItems: 'center', bottom: 8, left: 20, position: 'absolute', right: 20 },
  errorText: { color: '#890620', fontSize: 14, textAlign: 'center' },
  plansLink: { color: '#890620', fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' },
  composer: { alignItems: 'center', flexDirection: 'row' },
  iconButton: { alignItems: 'center', backgroundColor: '#890620', justifyContent: 'center' },
  iconButtonDisabled: { backgroundColor: '#bd8d87' },
  menu: { color: '#fff' },
  input: { backgroundColor: '#fff8f5', borderColor: '#cda49b', borderWidth: 1, color: '#2c0703', flex: 1 },
  arrow: { color: '#fff' },
});

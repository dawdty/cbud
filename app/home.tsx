import { useAuth, useUser } from '@clerk/expo';
import { fetch as expoFetch } from 'expo/fetch';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Markdown from 'react-native-markdown-renderer';

import { Buddy } from '../components/buddy';
import { subscribeToAccountDataCleared } from '../lib/account-data-events';

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
  conversationId?: unknown;
  assignmentId?: unknown;
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

function markdownStyles(color: string, mutedColor: string, codeBackground: string) {
  return {
    root: { color },
    text: { color, fontSize: 16, lineHeight: 22 },
    paragraph: { marginBottom: 7, marginTop: 0 },
    headingContainer: { marginBottom: 7, marginTop: 4 },
    heading: { color, fontWeight: '700' as const },
    heading1: { fontSize: 21, lineHeight: 27 },
    heading1Container: { borderBottomWidth: 0, paddingBottom: 0 },
    heading2: { fontSize: 19, lineHeight: 25 },
    heading2Container: { borderBottomWidth: 0, paddingBottom: 0 },
    heading3: { fontSize: 17, lineHeight: 23 },
    heading4: { fontSize: 16, lineHeight: 22 },
    heading5: { fontSize: 16, lineHeight: 22 },
    heading6: { fontSize: 16, lineHeight: 22 },
    list: { marginBottom: 7 },
    listUnorderedItem: { marginTop: 2 },
    listOrderedItem: { marginTop: 2 },
    listUnorderedItemIcon: { color, lineHeight: 22, marginLeft: 4, marginRight: 8 },
    listUnorderedItemText: { color, fontSize: 16, lineHeight: 22 },
    listOrderedItemIcon: { color, lineHeight: 22, marginLeft: 4, marginRight: 8 },
    listOrderedItemText: { color, fontSize: 16, lineHeight: 22 },
    link: { color: mutedColor, textDecorationLine: 'underline' as const },
    blocklink: { borderBottomColor: mutedColor },
    blockquote: { borderLeftColor: mutedColor, marginBottom: 7, paddingHorizontal: 10 },
    codeInline: { backgroundColor: codeBackground, color, fontSize: 14 },
    codeBlock: { backgroundColor: codeBackground, color, fontSize: 14, lineHeight: 20, marginBottom: 7, padding: 10 },
    pre: { marginBottom: 0 },
    hr: { backgroundColor: mutedColor, height: 1, marginBottom: 9, marginTop: 9 },
    table: { borderColor: mutedColor, marginBottom: 7 },
    tableHeader: { backgroundColor: codeBackground },
    tableHeaderCell: { borderColor: mutedColor, color },
    tableRow: { borderColor: mutedColor },
    tableRowCell: { borderColor: mutedColor, color },
  };
}

const userMarkdownStyles = markdownStyles('#2c0703', '#890620', '#f4e3de');
const assistantMarkdownStyles = markdownStyles('#fff', '#ffd6de', 'rgba(255, 255, 255, 0.14)');

function ChatBubble({ message }: { message: ChatTextMessage }) {
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

  const bubble = (
    <Animated.View
      style={[
        styles.bubble,
        isUser ? styles.userBubble : styles.assistantBubble,
        {
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
        style={isUser ? userMarkdownStyles : assistantMarkdownStyles}
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

function AssignmentCard({ assignment }: { assignment: AssignmentChatItem }) {
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
          <Text style={styles.assignmentCardTitle}>{assignment.title}</Text>
          <Text style={styles.assignmentCardDue}>{assignmentDueLabel(assignment.dueAt)}</Text>
        </View>
        <Pressable
          accessibilityLabel={`View ${assignment.title} in To Do's`}
          accessibilityRole="link"
          hitSlop={8}
          onPress={() => router.push({ pathname: '/todos', params: { refresh: 'true' } })}
          style={({ pressed }) => [styles.assignmentLink, pressed && styles.assignmentLinkPressed]}
        >
          <Text style={styles.assignmentLinkIcon}>→</Text>
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

function CompletionActivity({ activity }: { activity: CompletionActivityItem }) {
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
        <Text style={styles.completionActivityCheck}>{activity.state === 'failed' ? '!' : '✓'}</Text>
      )}
      <Text style={styles.completionActivityText}>{label}</Text>
    </View>
  );
}

export default function HomePage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const listRef = useRef<FlatList<ChatItem>>(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCanvasConnected, setIsCanvasConnected] = useState<boolean | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: messages.length > 1 }));
  }, [messages.length]);

  useEffect(() => subscribeToAccountDataCleared(() => {
    setMessages([]);
    setConversationId(null);
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

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !apiUrl) {
      return;
    }

    const controller = new AbortController();
    void (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const response = await fetch(`${apiUrl}/chat/history`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const body = (await response.json()) as {
          conversationId?: unknown;
          messages?: unknown;
        };
        if (!response.ok || typeof body.conversationId !== 'string' || !Array.isArray(body.messages)) return;

        const restored = body.messages.filter((candidate): candidate is ChatTextMessage => {
          if (!candidate || typeof candidate !== 'object') return false;
          const value = candidate as Partial<ChatTextMessage>;
          return (
            typeof value.id === 'string' &&
            (value.role === 'user' || value.role === 'assistant') &&
            typeof value.content === 'string'
          );
        });
        setConversationId(body.conversationId);
        setMessages((current) => current.length === 0 ? restored : current);
      } catch (historyError) {
        if (!(historyError instanceof Error && historyError.name === 'AbortError')) {
          console.warn('Could not load chat history');
        }
      }
    })();

    return () => controller.abort();
  }, [getToken, isLoaded, isSignedIn]);

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

    if (!content || isSending) {
      return;
    }

    const turnId = Date.now();
    const assistantMessageId = `${turnId}-assistant`;
    const userMessage: ChatTextMessage = { id: `${turnId}-user`, role: 'user', content };
    setMessages((current) => [...current, userMessage]);
    setMessage('');
    setError(null);
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
          ...(conversationId ? { conversationId } : {}),
        }),
      });
      if (!chatResponse.ok) {
        const body = await chatResponse.json().catch(() => null) as ChatStreamPayload | null;
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
              style={styles.canvasWarning}
            >
              <Text style={styles.canvasWarningIcon}>!</Text>
              <Text style={styles.canvasWarningText}>
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
                    ? <AssignmentCard assignment={item} />
                    : item.role === 'activity'
                      ? <CompletionActivity activity={item} />
                      : <ChatBubble message={item} />}
                  scrollEnabled
                  showsVerticalScrollIndicator
                  style={styles.messages}
                />
              )}
            </View>
            {error ? (
              <Text accessibilityLiveRegion="polite" style={styles.errorOverlay}>
                {error}
              </Text>
            ) : null}
            <View pointerEvents="none" style={styles.fixedBuddy}>
              <Buddy animation={isSending ? 'curious' : 'idle'} animationKey={messages.length} size={104} />
              <Text style={styles.buddyWordmark}>cbud.</Text>
            </View>
          </View>
          <View style={styles.composer}>
            <Pressable accessibilityLabel="Open menu" onPress={() => router.push('/settings')} style={styles.iconButton}>
              <Text style={styles.menu}>☰</Text>
            </Pressable>
            <TextInput
              accessibilityLabel="Message"
              editable={!isSending}
              onChangeText={setMessage}
              onSubmitEditing={() => void handleSend()}
              placeholder="Message cbud..."
              placeholderTextColor="#8f6e67"
              returnKeyType="send"
              style={styles.input}
              value={message}
            />
            <Pressable
              accessibilityLabel="Send message"
              disabled={!message.trim() || isSending}
              onPress={() => void handleSend()}
              style={[styles.iconButton, (!message.trim() || isSending) && styles.iconButtonDisabled]}
            >
              {isSending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.arrow}>↑</Text>}
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
  loading: { alignItems: 'center', backgroundColor: '#ebd4cb', flex: 1, justifyContent: 'center' },
  keyboardView: { flex: 1 },
  portal: { flex: 1, gap: 12, padding: 20 },
  canvasWarning: { alignItems: 'center', backgroundColor: '#890620', borderColor: '#890620', borderLeftWidth: 4, borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  canvasWarningIcon: { color: '#fff', fontSize: 17, fontWeight: '800' },
  canvasWarningText: { color: '#fff', flex: 1, fontSize: 14, fontWeight: '700' },
  canvasWarningLink: { textDecorationLine: 'underline' },
  chatArea: { flex: 1, position: 'relative' },
  chatWindow: { bottom: 150, left: 0, position: 'absolute', right: 0, top: 0 },
  introCopy: { flex: 1, justifyContent: 'center' },
  heading: { color: '#2c0703', fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  copy: { color: '#890620', fontSize: 16, lineHeight: 23, marginBottom: 10 },
  messages: { flex: 1 },
  messagesContent: { gap: 10, paddingBottom: 18, paddingTop: 8 },
  bubble: { borderRadius: 18, maxWidth: '84%', paddingHorizontal: 15, paddingVertical: 11 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#fff8f5', borderBottomRightRadius: 5 },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: '#890620', borderBottomLeftRadius: 5 },
  completionActivity: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: 7, minHeight: 24, paddingHorizontal: 3 },
  completionActivityCheck: { color: '#890620', fontSize: 14, fontWeight: '800', width: 14 },
  completionActivityText: { color: '#79534c', fontSize: 13, fontStyle: 'italic', lineHeight: 18 },
  assignmentCard: { alignSelf: 'stretch', backgroundColor: '#fff8f5', borderColor: '#890620', borderRadius: 14, borderWidth: 1, paddingHorizontal: 15, paddingVertical: 12 },
  assignmentCardRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  assignmentCardCopy: { flex: 1, gap: 4 },
  assignmentCardTitle: { color: '#2c0703', fontSize: 16, fontWeight: '700', lineHeight: 21 },
  assignmentCardDue: { color: '#79534c', fontSize: 12, lineHeight: 16 },
  assignmentLink: { alignItems: 'center', backgroundColor: '#890620', borderRadius: 17, height: 34, justifyContent: 'center', width: 34 },
  assignmentLinkPressed: { opacity: 0.7 },
  assignmentLinkIcon: { color: '#fff', fontSize: 18, fontWeight: '800', lineHeight: 20 },
  fixedBuddy: { alignItems: 'center', bottom: 5, left: 0, position: 'absolute', right: 0, zIndex: 1 },
  buddyWordmark: { bottom: 23, color: '#890620', fontSize: 28, fontWeight: '800', left: 2, letterSpacing: -1, position: 'absolute' },
  errorOverlay: { bottom: 8, color: '#890620', fontSize: 14, left: 20, position: 'absolute', right: 20, textAlign: 'center' },
  composer: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  iconButton: { alignItems: 'center', backgroundColor: '#890620', borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  iconButtonDisabled: { backgroundColor: '#bd8d87' },
  menu: { color: '#fff', fontSize: 22, lineHeight: 25 },
  input: { backgroundColor: '#fff8f5', borderColor: '#cda49b', borderRadius: 22, borderWidth: 1, color: '#2c0703', flex: 1, fontSize: 16, height: 44, paddingHorizontal: 16 },
  arrow: { color: '#fff', fontSize: 24, lineHeight: 26 },
});

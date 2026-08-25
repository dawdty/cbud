import { useAuth, useUser } from '@clerk/expo';
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

import { Buddy } from '../components/buddy';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

const apiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

function ChatBubble({ message }: { message: ChatMessage }) {
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
      <Text style={[styles.bubbleText, !isUser && styles.assistantBubbleText]}>{message.content}</Text>
    </Animated.View>
  );

  return bubble;
}

export default function HomePage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: messages.length > 1 }));
  }, [messages.length]);

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

    const userMessage: ChatMessage = { id: `${Date.now()}-user`, role: 'user', content };
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

      const chatResponse = await fetch(`${apiUrl}/chat`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: content }),
      });
      const body = (await chatResponse.json()) as { error?: unknown; message?: unknown };

      if (!chatResponse.ok) {
        throw new Error(typeof body.error === 'string' ? body.error : 'cbud could not reply.');
      }

      if (typeof body.message !== 'string' || !body.message.trim()) {
        throw new Error('cbud returned an empty reply.');
      }

      setMessages((current) => [
        ...current,
        { id: `${Date.now()}-assistant`, role: 'assistant', content: body.message as string },
      ]);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'cbud could not reply.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>
        <View style={styles.portal}>
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
                  renderItem={({ item }) => <ChatBubble message={item} />}
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
              {isSending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.arrow}>→</Text>}
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
  fixedBuddy: { alignItems: 'center', bottom: 5, left: 0, position: 'absolute', right: 0, zIndex: 1 },
  bubbleText: { color: '#2c0703', fontSize: 16, lineHeight: 22 },
  assistantBubbleText: { color: '#fff' },
  errorOverlay: { bottom: 8, color: '#890620', fontSize: 14, left: 20, position: 'absolute', right: 20, textAlign: 'center' },
  composer: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  iconButton: { alignItems: 'center', backgroundColor: '#890620', borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  iconButtonDisabled: { backgroundColor: '#bd8d87' },
  menu: { color: '#fff', fontSize: 22, lineHeight: 25 },
  input: { backgroundColor: '#fff8f5', borderColor: '#cda49b', borderRadius: 22, borderWidth: 1, color: '#2c0703', flex: 1, fontSize: 16, height: 44, paddingHorizontal: 16 },
  arrow: { color: '#fff', fontSize: 24, lineHeight: 26 },
});

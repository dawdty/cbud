import { useAuth, useSignIn, useSignUp } from '@clerk/expo';
import { StatusBar } from 'expo-status-bar';
import { Redirect, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Buddy, type BuddyAnimation, type BuddyEyes, type BuddyGaze } from './components/buddy/index';

type AuthMode = 'sign-in' | 'sign-up';
type ActiveField = 'email' | 'password' | 'code';

export default function App() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const { signIn, fetchStatus: signInFetchStatus } = useSignIn();
  const { signUp, fetchStatus: signUpFetchStatus } = useSignUp();
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [emailAddress, setEmailAddress] = useState('');
  const [emailCursorPosition, setEmailCursorPosition] = useState(0);
  const [emailCursorTarget, setEmailCursorTarget] = useState<{ x: number; y: number }>();
  const [emailTypingRevision, setEmailTypingRevision] = useState(0);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [errorRevision, setErrorRevision] = useState(0);
  const emailInputRef = useRef<TextInput>(null);
  const [activeField, setActiveField] = useState<ActiveField>();

  const isSubmitting = signInFetchStatus === 'fetching' || signUpFetchStatus === 'fetching';

  const showError = (message: string) => {
    setErrorMessage(message);
    setErrorRevision((revision) => revision + 1);
  };

  const finalizeSignIn = async () => {
    await signIn.finalize({ navigate: () => undefined });
    router.replace('/home');
  };

  const finalizeSignUp = async () => {
    await signUp.finalize({ navigate: () => undefined });
    router.replace('/home');
  };

  const handleSubmit = async () => {
    setErrorMessage(undefined);

    if (!emailAddress || !password) {
      showError('enter your email and password.');
      return;
    }

    if (mode === 'sign-in') {
      const { error } = await signIn.password({ emailAddress, password });
      if (error) {
        showError(toLowercaseError(error));
        return;
      }

      if (signIn.status === 'complete') {
        await finalizeSignIn();
      } else {
        showError('this sign in needs an additional verification step.');
      }
      return;
    }

    const { error } = await signUp.password({ emailAddress, password });
    if (error) {
      showError(toLowercaseError(error));
      return;
    }

    const { error: sendError } = await signUp.verifications.sendEmailCode();
    if (sendError) {
      showError(toLowercaseError(sendError));
      return;
    }

    setIsVerifying(true);
  };

  const handleVerification = async () => {
    setErrorMessage(undefined);
    const { error } = await signUp.verifications.verifyEmailCode({ code });

    if (error) {
      showError(toLowercaseError(error));
      return;
    }

    if (signUp.status === 'complete') {
      await finalizeSignUp();
    } else {
      showError('your account still needs more information.');
    }
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setIsVerifying(false);
    setCode('');
    setErrorMessage(undefined);
    setActiveField(undefined);
  };

  const updateEmailCursorPosition = (position: number) => {
    setEmailCursorPosition(position);
    requestAnimationFrame(() => {
      emailInputRef.current?.measureInWindow((x, y, width, height) => {
        const cursorX = Math.min(x + width - 16, x + 16 + position * 8);
        setEmailCursorTarget({ x: cursorX, y: y + height / 2 });
      });
    });
  };

  const handleEmailChange = (value: string) => {
    setEmailAddress(value);
    setEmailTypingRevision((revision) => (value ? revision + 1 : 0));
  };

  const buddyGaze = getBuddyGaze(activeField, emailAddress ? emailCursorTarget : undefined);
  const buddyEyes: BuddyEyes = activeField === 'password' ? 'closed' : 'open';
  const buddyAnimation: BuddyAnimation = errorMessage ? 'error' : activeField === 'email' && emailTypingRevision > 0 ? 'curious' : 'idle';
  const buddyAnimationKey = errorMessage ? `error-${errorRevision}` : `typing-${emailTypingRevision}`;

  if (!isLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#890620" />
      </View>
    );
  }

  if (isSignedIn) {
    return <Redirect href="/home" />;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.portal}>
        <View style={styles.introRow}>
          <View style={styles.introCopy}>
            <Text style={styles.wordmark}>cbud</Text>
            <Text style={styles.heading}>{isVerifying ? 'check your email' : mode === 'sign-in' ? 'welcome back' : 'create your account'}</Text>
            <Text style={styles.copy}>
              {isVerifying
                ? 'enter the verification code we sent you.'
                : mode === 'sign-in'
                  ? 'sign in to continue.'
                  : 'make an account to get started.'}
            </Text>
          </View>
          <Buddy animation={buddyAnimation} animationKey={buddyAnimationKey} eyes={buddyEyes} gaze={buddyGaze} />
        </View>

        {isVerifying ? (
          <>
            <TextInput
              autoCapitalize="none"
              autoComplete="one-time-code"
              keyboardType="number-pad"
              onChangeText={setCode}
              onFocus={() => setActiveField('code')}
              onBlur={() => setActiveField(undefined)}
              placeholder="verification code"
              placeholderTextColor="#b6465f"
              style={styles.input}
              value={code}
            />
            <PortalButton disabled={isSubmitting} label={isSubmitting ? 'verifying…' : 'verify email'} onPress={handleVerification} />
            <Pressable onPress={() => setIsVerifying(false)}>
              <Text style={styles.textButton}>back</Text>
            </Pressable>
          </>
        ) : (
          <>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              ref={emailInputRef}
              onChangeText={handleEmailChange}
              onSelectionChange={({ nativeEvent }) => updateEmailCursorPosition(nativeEvent.selection.start)}
              onFocus={() => {
                setActiveField('email');
                updateEmailCursorPosition(emailCursorPosition);
              }}
              onBlur={() => setActiveField(undefined)}
              placeholder="email address"
              placeholderTextColor="#b6465f"
              style={styles.input}
              value={emailAddress}
            />
            <TextInput
              autoCapitalize="none"
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              onChangeText={setPassword}
              onFocus={() => setActiveField('password')}
              onBlur={() => setActiveField(undefined)}
              placeholder="password"
              placeholderTextColor="#b6465f"
              secureTextEntry
              style={styles.input}
              value={password}
            />
            <PortalButton disabled={isSubmitting} label={isSubmitting ? 'one moment…' : mode === 'sign-in' ? 'sign in' : 'create account'} onPress={handleSubmit} />
            <Pressable onPress={() => switchMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}>
              <Text style={styles.textButton}>{mode === 'sign-in' ? 'new here? create an account' : 'already have an account? sign in'}</Text>
            </Pressable>
          </>
        )}

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      </View>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

function getBuddyGaze(activeField: ActiveField | undefined, emailCursorTarget: { x: number; y: number } | undefined): BuddyGaze | undefined {
  if (activeField === 'email' && emailCursorTarget) {
    return { type: 'point', ...emailCursorTarget };
  }
  if (activeField === 'password') {
    return { type: 'offset', x: 5.5, y: -6 };
  }
  if (activeField === 'code') {
    return { type: 'offset', x: 4, y: 0 };
  }
  return undefined;
}

function PortalButton({ disabled, label, onPress }: { disabled?: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.button, disabled && styles.buttonDisabled]}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

function toLowercaseError(error: unknown) {
  if (typeof error === 'object' && error && 'errors' in error) {
    const errors = error.errors;
    if (Array.isArray(errors) && errors[0] && typeof errors[0] === 'object') {
      const message = 'longMessage' in errors[0] ? errors[0].longMessage : errors[0].message;
      if (typeof message === 'string') return message.toLowerCase();
    }
  }

  return 'something went wrong. please try again.';
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#ebd4cb',
    flex: 1,
  },
  loading: {
    alignItems: 'center',
    backgroundColor: '#ebd4cb',
    flex: 1,
    justifyContent: 'center',
  },
  portal: {
    flex: 1,
    gap: 16,
    justifyContent: 'center',
    padding: 28,
  },
  introRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  introCopy: {
    flex: 1,
  },
  wordmark: {
    color: '#890620',
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -1.5,
    marginBottom: 18,
  },
  heading: {
    color: '#2c0703',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  copy: {
    color: '#890620',
    fontSize: 16,
    lineHeight: 23,
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#fff8f6',
    borderColor: '#da9f93',
    borderRadius: 12,
    borderWidth: 1,
    color: '#2c0703',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#890620',
    borderRadius: 12,
    marginTop: 4,
    paddingVertical: 16,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  textButton: {
    color: '#890620',
    fontSize: 15,
    paddingVertical: 8,
    textAlign: 'center',
  },
  error: {
    color: '#b6465f',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
    textAlign: 'center',
  },
});

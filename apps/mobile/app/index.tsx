import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { router } from 'expo-router';

// ---- エラーメッセージ日本語化 ----
function toJapanese(msg: string): string {
  if (!msg) return 'エラーが発生しました';
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials')) return 'メールアドレスまたはパスワードが正しくありません';
  if (m.includes('email not confirmed')) return 'メールアドレスの確認が完了していません。確認メールをご確認ください';
  if (m.includes('user already registered')) return 'メールアドレスまたはパスワードが正しくありません';
  if (m.includes('password should be at least')) return 'パスワードは6文字以上で入力してください';
  if (m.includes('unable to validate email')) return 'メールアドレスの形式が正しくありません';
  if (m.includes('email address is invalid')) return 'メールアドレスの形式が正しくありません';
  if (m.includes('signup is disabled')) return '現在新規登録は受け付けていません';
  if (m.includes('email rate limit exceeded')) return 'しばらく時間をおいてから再度お試しください';
  if (m.includes('over email send rate limit')) return 'メール送信の上限に達しました。しばらくお待ちください';
  if (m.includes('token has expired')) return 'リンクの有効期限が切れています。もう一度お試しください';
  if (m.includes('user not found')) return 'メールアドレスまたはパスワードが正しくありません';
  if (m.includes('network')) return 'ネットワークエラーが発生しました。接続を確認してください';
  return 'エラーが発生しました（' + msg + '）';
}

type Mode = 'login' | 'signup' | 'reset';

const TITLES: Record<Mode, string> = {
  login: 'ログイン',
  signup: '新規登録',
  reset: 'パスワードをリセット',
};

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // ログイン済みならホームへ
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/home');
      setChecking(false);
    });
  }, []);

  function switchMode(next: Mode) {
    setMode(next);
    setMessage(null);
    setPassword('');
  }

  async function handleSubmit() {
    if (!email) return;
    if (mode !== 'reset' && !password) return;
    setLoading(true);
    setMessage(null);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace('/home');

      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${process.env.EXPO_PUBLIC_APP_URL}/` },
        });
        if (error) throw error;
        setMessage({ type: 'success', text: '確認メールを送りました。メールのリンクをクリックしてください。' });

      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${process.env.EXPO_PUBLIC_APP_URL}/auth/confirm`,
        });
        if (error) throw error;
        setMessage({ type: 'success', text: 'パスワードリセットのメールを送りました。' });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: toJapanese(e.message ?? '') });
    } finally {
      setLoading(false);
    }
  }

  const isDisabled = loading || !email || (mode !== 'reset' && !password);

  if (checking) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#7c3aed" size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.bg}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>

          {/* ロゴ */}
          <View style={styles.logoArea}>
            <Text style={styles.logoEmoji}>🎨</Text>
            <Text style={styles.logoTitle}>Commission Tracker</Text>
            <Text style={styles.logoSub}>{TITLES[mode]}</Text>
          </View>

          {/* メッセージ */}
          {message && (
            <View style={[
              styles.messageBox,
              message.type === 'error' ? styles.messageError : styles.messageSuccess
            ]}>
              <Text style={[
                styles.messageText,
                message.type === 'error' ? styles.messageTextError : styles.messageTextSuccess
              ]}>
                {message.text}
              </Text>
            </View>
          )}

          {/* 入力フォーム */}
          <TextInput
            style={styles.input}
            placeholder="メールアドレス"
            placeholderTextColor="#aaa"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          {mode !== 'reset' && (
            <TextInput
              style={styles.input}
              placeholder="パスワード（6文字以上）"
              placeholderTextColor="#aaa"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          )}

          {/* メインボタン */}
          <TouchableOpacity
            style={[styles.button, isDisabled && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isDisabled}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>{TITLES[mode]}</Text>
            }
          </TouchableOpacity>

          {/* モード切替 */}
          <View style={styles.linkArea}>
            {mode === 'login' && (
              <>
                <View style={styles.linkRow}>
                  <Text style={styles.linkLabel}>アカウントをお持ちでない方は</Text>
                  <TouchableOpacity onPress={() => switchMode('signup')}>
                    <Text style={styles.link}>新規登録</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => switchMode('reset')}>
                  <Text style={styles.link}>パスワードを忘れた方はこちら</Text>
                </TouchableOpacity>
              </>
            )}
            {mode === 'signup' && (
              <View style={styles.linkRow}>
                <Text style={styles.linkLabel}>すでにアカウントをお持ちの方は</Text>
                <TouchableOpacity onPress={() => switchMode('login')}>
                  <Text style={styles.link}>ログイン</Text>
                </TouchableOpacity>
              </View>
            )}
            {mode === 'reset' && (
              <TouchableOpacity onPress={() => switchMode('login')}>
                <Text style={styles.link}>← ログインに戻る</Text>
              </TouchableOpacity>
            )}
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#faf8f5',
  },
  bg: {
    flex: 1,
    backgroundColor: '#1a0a2e',
  },
  scroll: {
    flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 16,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 24, padding: 32,
    width: '100%', maxWidth: 400,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 24, elevation: 8,
  },
  logoArea: {
    alignItems: 'center', marginBottom: 28,
  },
  logoEmoji: { fontSize: 40, marginBottom: 8 },
  logoTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a0a2e', marginBottom: 4 },
  logoSub: { fontSize: 13, color: '#888' },
  messageBox: {
    padding: 12, borderRadius: 10, marginBottom: 16, borderWidth: 1,
  },
  messageError: { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
  messageSuccess: { backgroundColor: '#d1fae5', borderColor: '#6ee7b7' },
  messageText: { fontSize: 13 },
  messageTextError: { color: '#b91c1c' },
  messageTextSuccess: { color: '#065f46' },
  input: {
    width: '100%', padding: 12, borderWidth: 1.5, borderColor: '#e5e7eb',
    borderRadius: 12, fontSize: 16, backgroundColor: '#faf8f5',
    marginBottom: 12, color: '#1a0a2e',
  },
  button: {
    width: '100%', padding: 14, borderRadius: 12,
    backgroundColor: '#7c3aed', alignItems: 'center', marginTop: 4,
  },
  buttonDisabled: { backgroundColor: '#c4b5fd' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  linkArea: {
    marginTop: 20, alignItems: 'center', gap: 10,
  },
  linkRow: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', gap: 4,
  },
  linkLabel: { fontSize: 13, color: '#666' },
  link: { fontSize: 13, color: '#7c3aed', fontWeight: 'bold' },
});

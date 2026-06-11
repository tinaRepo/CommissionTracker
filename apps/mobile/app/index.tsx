import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { router } from 'expo-router';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [checking, setChecking] = useState(true);

    // すでにログイン済みならホームへ
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) router.replace('/home');
            setChecking(false);
        });
    }, []);

    async function handleLogin() {
        if (!email || !password) return;
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            router.replace('/home');
        } catch (e: any) {
            setError('メールアドレスまたはパスワードが正しくありません');
        } finally {
            setLoading(false);
        }
    }

    if (checking) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color="#7c3aed" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.logo}>🎨</Text>
            <Text style={styles.title}>Commission Tracker</Text>
            <Text style={styles.subtitle}>ログイン</Text>

            {error && (
                <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            <TextInput
                style={styles.input}
                placeholder="メールアドレス"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
            />
            <TextInput
                style={styles.input}
                placeholder="パスワード"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />

            <TouchableOpacity
                style={[styles.button, (!email || !password || loading) && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={!email || !password || loading}
            >
                {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.buttonText}>ログイン</Text>
                }
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    center: {
        flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#faf8f5',
    },
    container: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#faf8f5', padding: 24,
    },
    logo: { fontSize: 48, marginBottom: 8 },
    title: { fontSize: 22, fontWeight: 'bold', color: '#1a0a2e', marginBottom: 4 },
    subtitle: { fontSize: 14, color: '#888', marginBottom: 32 },
    errorBox: {
        width: '100%', padding: 12, borderRadius: 10,
        backgroundColor: '#fee2e2', marginBottom: 16,
    },
    errorText: { color: '#b91c1c', fontSize: 13 },
    input: {
        width: '100%', padding: 12, borderWidth: 1.5, borderColor: '#e5e7eb',
        borderRadius: 12, fontSize: 16, backgroundColor: '#fff',
        marginBottom: 12, color: '#1a0a2e',
    },
    button: {
        width: '100%', padding: 14, borderRadius: 12,
        backgroundColor: '#7c3aed', alignItems: 'center', marginTop: 8,
    },
    buttonDisabled: { backgroundColor: '#c4b5fd' },
    buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';
import { router } from 'expo-router';

export default function HomeScreen() {
    async function handleLogout() {
        await supabase.auth.signOut();
        router.replace('/');
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>🎨 Commission Tracker</Text>
            <Text style={styles.subtitle}>ログイン成功！</Text>
            <TouchableOpacity style={styles.button} onPress={handleLogout}>
                <Text style={styles.buttonText}>ログアウト</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#faf8f5',
    },
    title: { fontSize: 22, fontWeight: 'bold', color: '#1a0a2e', marginBottom: 8 },
    subtitle: { fontSize: 14, color: '#888', marginBottom: 32 },
    button: {
        padding: 14, borderRadius: 12, backgroundColor: '#7c3aed',
    },
    buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
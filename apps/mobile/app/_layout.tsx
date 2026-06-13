import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { NativeModules, Platform } from 'react-native';

export default function RootLayout() {
    useEffect(() => {
        // Androidのロケールを日本語に設定
        if (Platform.OS === 'android') {
            const RNLocalize = NativeModules.RNLocalize;
            if (RNLocalize) {
                RNLocalize.setLocale?.('ja_JP');
            }
        }
    }, []);

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="home" />
            <Stack.Screen name="commission" />
        </Stack>
    );
}
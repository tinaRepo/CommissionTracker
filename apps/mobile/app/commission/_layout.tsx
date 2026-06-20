import { Stack } from 'expo-router';

export default function CommissionLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="[id]" />
            <Stack.Screen name="new" />
            <Stack.Screen name="edit/[id]" />
        </Stack>
    );
}
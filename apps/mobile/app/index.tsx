import { View, Text, StyleSheet } from 'react-native';

export default function HomeScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>🎨 Commission Tracker</Text>
            <Text style={styles.subtitle}>Mobile App</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#faf8f5',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1a0a2e',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#888',
    },
});
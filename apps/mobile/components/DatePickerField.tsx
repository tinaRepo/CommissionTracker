import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

type Props = {
    label: string;
    value: string;
    onChange: (v: string) => void;
    required?: boolean;
};

function fmtDisplay(d: string) {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${y}/${m}/${day}`;
}

export default function DatePickerField({ label, value, onChange, required }: Props) {
    const [visible, setVisible] = useState(false);

    function handleConfirm(date: Date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        onChange(`${y}-${m}-${d}`);
        setVisible(false);
    }

    const dateValue = value ? new Date(value) : new Date();

    return (
        <View style={styles.field}>
            <Text style={styles.label}>
                {label}{required && <Text style={styles.required}> *</Text>}
            </Text>
            <View style={styles.row}>
                <TouchableOpacity
                    style={[styles.button, !value && styles.buttonEmpty]}
                    onPress={() => setVisible(true)}
                >
                    <Text style={[styles.buttonText, !value && styles.buttonTextEmpty]}>
                        {value ? fmtDisplay(value) : '日付を選択'}
                    </Text>
                </TouchableOpacity>
                {value && (
                    <TouchableOpacity style={styles.clearButton} onPress={() => onChange('')}>
                        <Text style={styles.clearText}>×</Text>
                    </TouchableOpacity>
                )}
            </View>
            <DateTimePickerModal
                isVisible={visible}
                mode="date"
                date={dateValue}
                onConfirm={handleConfirm}
                onCancel={() => setVisible(false)}
                locale="ja_JP"
                confirmTextIOS="確定"
                cancelTextIOS="キャンセル"
                // onChangeを使わずonConfirm/onCancelのみで制御
                display={undefined}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    field: { gap: 6 },
    label: { fontSize: 12, fontWeight: '700', color: '#555', letterSpacing: 0.5 },
    required: { color: '#ef4444' },
    row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    button: {
        flex: 1, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e5e7eb',
        borderRadius: 12, padding: 12,
    },
    buttonEmpty: { borderColor: '#e5e7eb' },
    buttonText: { fontSize: 16, color: '#1a0a2e' },
    buttonTextEmpty: { color: '#aaa' },
    clearButton: {
        width: 36, height: 36, borderRadius: 8, backgroundColor: '#f3f4f6',
        borderWidth: 1.5, borderColor: '#e5e7eb',
        alignItems: 'center', justifyContent: 'center',
    },
    clearText: { color: '#888', fontSize: 16 },
});
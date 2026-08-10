import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import {
    registerMobilePushToken,
    unregisterMobilePushToken,
} from '@commission-tracker/supabase';

const ASKED_FLAG_KEY = 'push_permission_asked_v1';

// フォアグラウンド時の通知表示挙動
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

function getProjectId(): string | undefined {
    return (
        Constants.expoConfig?.extra?.eas?.projectId ??
        (Constants.expoConfig as any)?.eas?.projectId
    );
}

/**
 * 通知許可をリクエストし、Expo Push Tokenを取得する。
 * 実機でのみ動作（シミュレータ/エミュレータではnullを返す）。
 * すでに許可/拒否済みの場合は、OSのダイアログは出さずに現在の状態を返す
 * （`requestPermissionsAsync`はOSが既に確定した結果がある場合は再ダイアログを出さない）。
 */
export async function registerForPushNotificationsAsync(): Promise<
    string | null
> {
    if (!Device.isDevice) {
        console.warn(
            'プッシュ通知は実機でのみ動作します（シミュレータ/エミュレータでは取得できません）'
        );
        return null;
    }

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.DEFAULT,
        });
    }

    const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }
    if (finalStatus !== 'granted') {
        return null;
    }

    const projectId = getProjectId();
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
    );
    return tokenResponse.data;
}

/**
 * 通知を許可し、トークンをDBに登録する（初回起動時の確認で「許可する」を選んだ時に呼ぶ）。
 */
export async function enablePushNotifications(): Promise<boolean> {
    const token = await registerForPushNotificationsAsync();
    if (!token) return false;

    await registerMobilePushToken(
        supabase,
        token,
        Platform.OS as 'ios' | 'android',
        Device.osBuildId ?? Device.modelId ?? null
    );
    return true;
}

/**
 * トークンをDBから削除する（アンインストール検知時などに使用）。
 * 通常の利用ではOS側の通知設定がOFFになるだけでアプリからは呼ばない。
 */
export async function disablePushNotifications(
    expoPushToken: string
): Promise<void> {
    await unregisterMobilePushToken(supabase, expoPushToken);
}

/**
 * 現在許可済み・取得可能なトークンを返す。許可されていない場合はnull。
 * OSダイアログは出さない（現在の状態を確認するだけ）。
 */
export async function getCurrentPushToken(): Promise<string | null> {
    if (!Device.isDevice) return null;
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return null;

    const projectId = getProjectId();
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
    );
    return tokenResponse.data;
}

// ─── 初回起動時の確認フラグ（ローカル保存・端末ごと） ──────────

export async function hasAskedPushPermission(): Promise<boolean> {
    const value = await AsyncStorage.getItem(ASKED_FLAG_KEY);
    return value === 'true';
}

export async function markPushPermissionAsked(): Promise<void> {
    await AsyncStorage.setItem(ASKED_FLAG_KEY, 'true');
}

/**
 * 現在OS側で通知が許可されている場合、DBへのトークン登録を同期する。
 * OSの「設定」アプリから後からONにされたケースをアプリ復帰時にキャッチするためのもの。
 * 既に登録済みのトークンに対しては upsert になるため、何度呼んでも安全。
 */
export async function syncPushTokenIfGranted(): Promise<void> {
    const token = await getCurrentPushToken();
    if (!token) return;
    try {
        await registerMobilePushToken(
            supabase,
            token,
            Platform.OS as 'ios' | 'android',
            Device.osBuildId ?? Device.modelId ?? null
        );
    } catch (e) {
        console.error('push token sync error:', e);
    }
}

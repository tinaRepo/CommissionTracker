export type AnnouncementType =
    | 'お知らせ'
    | 'メンテナンス'
    | '障害情報'
    | 'キャンペーン';

export interface Announcement {
    id: string;
    title: string;
    content: string;
    type: AnnouncementType;
    published_at: string;
    created_at: string;
    updated_at: string;
}

export interface UserNotificationStatus {
    user_id: string;
    announcement_id: string;
    is_read: boolean;
    created_at: string;
}

export interface VersionRelease {
    id: string;
    version: string;
    title: string;
    released_at: string;  // date（ISO文字列）
    created_at: string;
}

export type VersionReleaseItemCategory = '新機能' | '改善' | '修正';

export interface VersionReleaseItem {
    id: string;
    release_id: string;
    category: VersionReleaseItemCategory;
    content: string;
    sort_order: number;
    created_at: string;
}

export interface PushSubscription {
    user_id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    created_at: string;
}
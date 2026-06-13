export type CommissionStatus =
    | 'pending'    // 依頼済み
    | 'rough'      // ラフ確認中
    | 'progress'   // 制作中
    | 'done'       // 完成
    | 'cancelled'; // キャンセル

export type ImageType =
    | 'rough'    // ラフ
    | 'wip'      // 作業中
    | 'finished' // 完成
    | 'other';   // その他

export interface Commission {
    id: string;
    user_id: string;
    title: string;
    artist: string;
    x_id?: string;
    ordered_at?: string;
    deadline?: string;
    price?: number;
    currency: string;
    status: CommissionStatus;
    rough_date?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
    images?: CommissionImage[];
}

export interface CommissionImage {
    id: string;
    commission_id: string;
    storage_path: string;
    file_name: string;
    image_type: ImageType;
    uploaded_at: string;
}

/** ステータスの日本語ラベル */
export const STATUS_LABELS: Record<CommissionStatus, string> = {
    pending: '依頼済み',
    rough: 'ラフ確認中',
    progress: '制作中',
    done: '完成',
    cancelled: 'キャンセル',
} as const;

/** 納期アラートの閾値（日） */
export const DEADLINE_ALERT_DAYS = 7;
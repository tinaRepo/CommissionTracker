export type Plan = 'free' | 'standard' | 'premium';

export type SubscriptionStatus = 'active' | 'inactive';

export interface UserProfile {
    id: string;
    plan: Plan;
    is_admin: boolean;
    display_name?: string;
    stripe_customer_id?: string;
    stripe_subscription_id?: string;
    subscription_status?: SubscriptionStatus;
    email?: string;
    created_at: string;
    updated_at: string;
}

export interface UserSettings {
    user_id: string;
    last_seen_release_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface PlanLimit {
    label: string;
    imageLimit: number | null;
    color: string;
    bg: string;
}

/** プランごとの制限・表示設定 */
export const PLAN_LIMITS: Record<Plan, PlanLimit> = {
    free: { label: '無料', imageLimit: 10, color: '#6b7280', bg: '#f3f4f6' },
    standard: { label: 'スタンダード', imageLimit: 50, color: '#3b82f6', bg: '#dbeafe' },
    premium: { label: 'プレミアム', imageLimit: null, color: '#f59e0b', bg: '#fef3c7' },
} as const;

/** プランごとの月額料金（円） */
export const PLAN_PRICES: Record<Plan, number> = {
    free: 0,
    standard: 300,
    premium: 800,
} as const;
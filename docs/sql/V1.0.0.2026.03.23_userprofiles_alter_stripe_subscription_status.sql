-- sitipe_customer_id, sitipe_subscription_id, subscription_statusを追加
alter table user_profiles
    add column if not exists stripe_customer_id text,
    add column if not exists stripe_subscription_id text,
    add column if not exists subscription_status text default 'inactive';
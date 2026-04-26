-- display_nameカラムを追加
alter table user_profiles add column if not exists display_name text;
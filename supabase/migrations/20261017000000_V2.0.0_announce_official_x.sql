insert into public.announcements (title, content, type, published_at)
select
  '公式Xアカウント開設のお知らせ',
  E'ツクリストの公式Xアカウントを開設しました。\nサービスの更新情報や使い方のヒントなどを発信していきます。ぜひフォローしてください。\nhttps://x.com/tsukurist_nouki',
  'お知らせ',
  now()
where not exists (
  select 1
  from public.announcements
  where title = '公式Xアカウント開設のお知らせ'
);

"use client";

const VERSION = "1.0.2";
const RELEASE_DATE = "2026年5月";

const CHANGELOG = [
    {
    version: "1.0.2",
    date: "2026年5月",
    changes: [
      "文字入力時の自動ズームインの抑制（特にモバイルでのユーザビリティ向上）",
    ],
  },
  {
    version: "1.0.1",
    date: "2026年4月",
    changes: [
      "プッシュ通知の追加",
      "LP画面の遷移リンクの追加（サービス紹介と登録誘導）",
      "日付の計算処理をタイムゾーンに合わせて修正",
    ],
  },
  {
    version: "1.0.0",
    date: "2026年3月",
    changes: [
      "正式リリース",
      "依頼の登録・編集・削除",
      "ステータス管理（依頼済み／ラフ確認中／制作中／完成／キャンセル）",
      "画像アップロード（ラフ・作業中・完成・その他）",
      "プランごとの画像枚数制限（無料10枚／スタンダード50枚／プレミアム無制限）",
      "依頼一覧の並び替え・フィルタ機能",
      "納期7日前アラート",
      "表示名の設定",
      "管理者ページ（プラン変更・ユーザー削除）",
      "お問い合わせフォーム",
      "アカウント削除申請機能",
      "デモモード（ログイン不要で試せる）",
      "PWA対応（ホーム画面に追加可能）",
    ],
  },
];

export default function VersionPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#faf8f5", fontFamily: "'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif" }}>
      <header style={{ background: "linear-gradient(135deg,#1a0a2e 0%,#2d1a4a 60%,#1a2a4a 100%)", padding: "20px 24px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 4px 32px #0004" }}>
        <button onClick={() => window.history.back()} style={{ background: "#ffffff18", border: "1px solid #ffffff30", color: "#c4b5fd", borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>← 戻る</button>
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 800 }}>バージョン情報</span>
      </header>
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px 80px" }}>

        {/* 現在のバージョン */}
        <div style={{ background: "linear-gradient(135deg,#1a0a2e,#2d1a4a)", borderRadius: 20, padding: "32px", textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎨</div>
          <div style={{ color: "#fff", fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Commission Tracker</div>
          <div style={{ color: "#a78bfa", fontSize: 14, marginBottom: 16 }}>絵の依頼管理ツール</div>
          <div style={{ display: "inline-block", background: "#7c3aed", color: "#fff", borderRadius: 999, padding: "6px 24px", fontSize: 16, fontWeight: 800 }}>
            v{VERSION}
          </div>
          <div style={{ color: "#c4b5fd", fontSize: 12, marginTop: 10 }}>{RELEASE_DATE} リリース</div>
        </div>

        {/* 技術スタック */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1a0a2e", marginBottom: 16, paddingBottom: 6, borderBottom: "2px solid #ede9fe" }}>技術スタック</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
            {[
              { label: "フロントエンド", value: "Next.js 14 / React" },
              { label: "バックエンド", value: "Supabase" },
              { label: "ホスティング", value: "Vercel" },
              { label: "決済", value: "Stripe" },
              { label: "メール送信", value: "Resend" },
              { label: "認証", value: "Supabase Auth" },
            ].map(item => (
              <div key={item.label} style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", border: "1.5px solid #f0f0f0" }}>
                <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a0a2e" }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 更新履歴 */}
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1a0a2e", marginBottom: 16, paddingBottom: 6, borderBottom: "2px solid #ede9fe" }}>更新履歴</h2>
          {CHANGELOG.map(log => (
            <div key={log.version} style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ background: "#ede9fe", color: "#7c3aed", borderRadius: 999, padding: "3px 14px", fontSize: 13, fontWeight: 800 }}>v{log.version}</span>
                <span style={{ fontSize: 12, color: "#aaa" }}>{log.date}</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {log.changes.map((c, i) => (
                  <li key={i} style={{ fontSize: 13, color: "#555", lineHeight: 1.8 }}>{c}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

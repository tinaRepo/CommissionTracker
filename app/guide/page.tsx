"use client";
export default function GuidePage() {
  return (
    <div style={{ minHeight:"100vh", background:"#faf8f5", fontFamily:"'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif" }}>
      <header style={{ background:"linear-gradient(135deg,#1a0a2e 0%,#2d1a4a 60%,#1a2a4a 100%)", padding:"20px 24px", display:"flex", alignItems:"center", gap:12, boxShadow:"0 4px 32px #0004" }}>
        <button onClick={() => window.history.back()} style={{ background:"#ffffff18", border:"1px solid #ffffff30", color:"#c4b5fd", borderRadius:8, padding:"6px 12px", fontSize:12, cursor:"pointer", fontWeight:600 }}>← 戻る</button>
        <span style={{ color:"#fff", fontSize:18, fontWeight:800 }}>使い方ガイド</span>
      </header>
      <main style={{ maxWidth:720, margin:"0 auto", padding:"32px 24px 80px" }}>

        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🎨</div>
          <div style={{ fontSize:20, fontWeight:800, color:"#1a0a2e", marginBottom:8 }}>Commission Tracker</div>
          <div style={{ fontSize:14, color:"#888" }}>絵の依頼を一元管理するツールです</div>
        </div>

        <Section title="🚀 はじめかた">
          <Step num={1} title="アカウントを作成する">
            メールアドレスとパスワードを入力して新規登録します。確認メールが届いたらリンクをクリックしてください。
          </Step>
          <Step num={2} title="表示名を設定する">
            右上のユーザーメニュー →「✏️ 名前を変更」から表示名を設定できます。
          </Step>
          <Step num={3} title="最初の依頼を登録する">
            「＋ 新規登録」ボタンから依頼情報を入力します。件名と絵師名は必須です。
          </Step>
        </Section>

        <Section title="📋 依頼の管理">
          <Step num={1} title="依頼を登録する">
            件名・絵師名・X ID・依頼日・納期・ラフ提出日・金額・ステータス・メモを入力できます。日付は後から削除できます。
          </Step>
          <Step num={2} title="ステータスを更新する">
            依頼をタップ→「編集」からステータスを変更できます。<br />
            <span style={{ display:"inline-flex", gap:6, flexWrap:"wrap", marginTop:6 }}>
              {[
                { label:"依頼済み", color:"#f59e0b", bg:"#fef3c7" },
                { label:"ラフ確認中", color:"#8b5cf6", bg:"#ede9fe" },
                { label:"制作中", color:"#3b82f6", bg:"#dbeafe" },
                { label:"完成", color:"#10b981", bg:"#d1fae5" },
                { label:"キャンセル", color:"#6b7280", bg:"#f3f4f6" },
              ].map(s => (
                <span key={s.label} style={{ background:s.bg, color:s.color, borderRadius:999, padding:"2px 10px", fontSize:11, fontWeight:700 }}>{s.label}</span>
              ))}
            </span>
          </Step>
          <Step num={3} title="画像を添付する">
            依頼の詳細画面から画像を追加できます。ラフ・作業中・完成・その他の種類を選んでアップロードしてください。
          </Step>
          <Step num={4} title="並び替え・フィルタ">
            依頼一覧は依頼日・納期・金額・ステータスで並び替え可能です。ステータスボタンでフィルタリングもできます。
          </Step>
        </Section>

        <Section title="⚠️ 納期アラート">
          <p>納期が7日以内に迫った依頼はカードが赤くハイライトされ、「⚠ あとN日」と表示されます。完成・キャンセルの依頼にはアラートは表示されません。</p>
        </Section>

        <Section title="📷 画像のプラン制限">
          <p>プランによってアップロードできる画像の合計枚数が異なります。</p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginTop:12 }}>
            {[
              { label:"無料", limit:"10枚まで", color:"#6b7280", bg:"#f3f4f6" },
              { label:"スタンダード", limit:"50枚まで", color:"#3b82f6", bg:"#dbeafe" },
              { label:"プレミアム", limit:"無制限", color:"#7c3aed", bg:"#ede9fe" },
            ].map(p => (
              <div key={p.label} style={{ background:p.bg, borderRadius:12, padding:"12px", textAlign:"center" }}>
                <span style={{ color:p.color, fontWeight:800, fontSize:13 }}>{p.label}</span>
                <div style={{ color:p.color, fontSize:12, marginTop:4 }}>{p.limit}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="📱 スマホで使う">
          <p>SafariやChromeの「ホーム画面に追加」からアプリとして使えます。アドレスバーが非表示になり、より快適に操作できます。</p>
        </Section>

        <Section title="🗑 アカウントを削除したいとき">
          <p>ユーザーメニュー →「🗑 アカウント削除を申請」から削除申請を送信できます。管理者が確認後、アカウントとすべてのデータを削除します。</p>
        </Section>

        <div style={{ marginTop:40, textAlign:"center" }}>
          <p style={{ fontSize:13, color:"#888", marginBottom:16 }}>わからないことがあれば</p>
          <a href="/contact" style={{ display:"inline-block", background:"linear-gradient(135deg,#7c3aed,#4f46e5)", color:"#fff", textDecoration:"none", borderRadius:12, padding:"12px 32px", fontWeight:700, fontSize:14 }}>
            ✉️ お問い合わせ
          </a>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom:36 }}>
      <h2 style={{ fontSize:16, fontWeight:800, color:"#1a0a2e", marginBottom:16, paddingBottom:6, borderBottom:"2px solid #ede9fe" }}>{title}</h2>
      <div style={{ fontSize:14, color:"#444", lineHeight:1.8 }}>{children}</div>
    </div>
  );
}

function Step({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <div style={{ display:"flex", gap:14, marginBottom:20 }}>
      <div style={{ width:28, height:28, borderRadius:"50%", background:"linear-gradient(135deg,#7c3aed,#4f46e5)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, flexShrink:0, marginTop:2 }}>{num}</div>
      <div>
        <div style={{ fontWeight:700, fontSize:14, color:"#1a0a2e", marginBottom:4 }}>{title}</div>
        <div style={{ fontSize:13, color:"#666", lineHeight:1.7 }}>{children}</div>
      </div>
    </div>
  );
}

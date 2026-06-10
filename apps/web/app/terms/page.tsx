"use client";
export default function TermsPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#faf8f5", fontFamily: "'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif" }}>
      <header style={{ background: "linear-gradient(135deg,#1a0a2e 0%,#2d1a4a 60%,#1a2a4a 100%)", padding: "20px 24px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 4px 32px #0004" }}>
        <button onClick={() => window.history.back()} style={{ background: "#ffffff18", border: "1px solid #ffffff30", color: "#c4b5fd", borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>← 戻る</button>
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 800 }}>利用規約</span>
      </header>
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px 80px" }}>
        <p style={{ fontSize: 12, color: "#aaa", marginBottom: 24 }}>最終更新日：2026年3月23日</p>

        <Section title="第1条（適用）">
          <p>本規約は、Commission Tracker（以下「本サービス」）の利用に関する条件を定めるものです。ユーザーの皆さまは本規約に同意の上、本サービスをご利用ください。</p>
        </Section>

        <Section title="第2条（利用登録）">
          <p>本サービスの利用を希望する方は、本規約に同意した上で、所定の方法により利用登録を申請するものとします。運営者が登録を承認した時点で、利用契約が成立するものとします。</p>
          <p>以下に該当する場合、登録を拒否することがあります。</p>
          <ul style={{ fontSize: 14, color: "#444", lineHeight: 1.8, paddingLeft: 20 }}>
            <li>虚偽の情報を申請した場合</li>
            <li>過去に本規約違反により利用停止となった場合</li>
            <li>その他、運営者が不適切と判断した場合</li>
          </ul>
        </Section>

        <Section title="第3条（禁止事項）">
          <p>ユーザーは以下の行為をしてはなりません。</p>
          <ul style={{ fontSize: 14, color: "#444", lineHeight: 1.8, paddingLeft: 20 }}>
            <li>法令または公序良俗に違反する行為</li>
            <li>犯罪行為に関連する行為</li>
            <li>本サービスの運営を妨害する行為</li>
            <li>他のユーザーまたは第三者の権利を侵害する行為</li>
            <li>不正アクセス、リバースエンジニアリング等の行為</li>
            <li>その他、運営者が不適切と判断する行為</li>
          </ul>
        </Section>

        <Section title="第4条（有料プランと料金）">
          <p>本サービスには無料プランと有料プラン（スタンダード・プレミアム）があります。有料プランの料金・内容は別途定める料金表に従います。</p>
          <p>料金は前払い制とし、一度お支払いいただいた料金は原則として返金いたしません。ただし、法令に基づく場合はこの限りではありません。</p>
        </Section>

        <Section title="第5条（サービスの停止・変更）">
          <p>運営者は、以下の場合にサービスを停止・変更することがあります。</p>
          <ul style={{ fontSize: 14, color: "#444", lineHeight: 1.8, paddingLeft: 20 }}>
            <li>システムメンテナンスを行う場合</li>
            <li>天災・事故等の不可抗力が生じた場合</li>
            <li>その他、運営者が必要と判断した場合</li>
          </ul>
        </Section>

        <Section title="第6条（免責事項）">
          <p>運営者は、本サービスに関してユーザーが被った損害について、運営者の故意または重大な過失による場合を除き、責任を負いません。</p>
          <p>本サービスは現状有姿で提供されており、特定目的への適合性・完全性・正確性等を保証するものではありません。</p>
        </Section>

        <Section title="第7条（退会・アカウント削除）">
          <p>ユーザーはいつでも退会申請が可能です。アカウント削除後は登録データが完全に削除され、復元できません。</p>
        </Section>

        <Section title="第8条（規約の変更）">
          <p>運営者は必要に応じて本規約を変更することがあります。変更後の規約はサービス上での告知をもって効力が生じるものとします。</p>
        </Section>

        <Section title="第9条（準拠法・管轄）">
          <p>本規約は日本法を準拠法とし、本サービスに関する紛争は日本の裁判所を専属的合意管轄とします。</p>
        </Section>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1a0a2e", marginBottom: 10, paddingBottom: 6, borderBottom: "2px solid #ede9fe" }}>{title}</h2>
      <div style={{ fontSize: 14, color: "#444", lineHeight: 1.8 }}>{children}</div>
    </div>
  );
}

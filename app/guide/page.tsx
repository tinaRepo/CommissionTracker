"use client";
// 使い方ガイド
export default function GuidePage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--surface)" }}>
      <header className="doc-header">
        <button onClick={() => window.history.back()} className="doc-back-btn">← 戻る</button>
        <span className="title">使い方ガイド</span>
      </header>
      <main className="container-narrow" style={{ padding: "32px 24px 80px" }}>

        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>ツクリスト</div>
          <div className="text-muted" style={{ fontSize: 14 }}>依頼・タスクの納期を一元管理するツールです</div>
        </div>

        <Section title="はじめかた">
          <Step num={1} title="アカウントを作成する">
            メールアドレスとパスワードを入力して新規登録します。確認メールが届いたらリンクをクリックしてください。
          </Step>
          <Step num={2} title="表示名を設定する">
            右上のユーザーメニュー →「名前を変更」から表示名を設定できます。
          </Step>
          <Step num={3} title="最初のタスクを登録する">
            「＋ 新規登録」ボタンからタスク情報を入力します。件名と依頼先名は必須です。
          </Step>
        </Section>

        <Section title="タスクの管理">
          <Step num={1} title="タスクを登録する">
            件名・依頼先名・SNS/連絡先・依頼日・納期・提出日・金額・ステータス・メモを入力できます。日付は後から削除できます。
          </Step>
          <Step num={2} title="ステータスを更新する">
            タスクをタップ→「編集」からステータスを変更できます。
            <div className="row" style={{ gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              {[
                { label: "依頼済み", cls: "badge-pending" },
                { label: "確認中", cls: "badge-checking" },
                { label: "制作中", cls: "badge-progress" },
                { label: "完成", cls: "badge-done" },
                { label: "キャンセル", cls: "badge-cancelled" },
              ].map(s => <span key={s.label} className={`badge ${s.cls}`}>{s.label}</span>)}
            </div>
          </Step>
          <Step num={3} title="画像を添付する">
            タスクの詳細画面から画像を追加できます。確認用・制作中・完成・その他の種類を選んでアップロードしてください。
          </Step>
          <Step num={4} title="並び替え・フィルタ">
            タスク一覧は依頼日・納期・金額・ステータスで並び替え可能です。ステータスボタンでフィルタリングもできます。
          </Step>
        </Section>

        <Section title="納期アラート">
          <p>納期が7日以内に迫ったタスクは<strong>アプリ内でハイライト表示</strong>されます。</p>
          <div style={{ background: "var(--danger-soft)", borderRadius: "var(--radius-md)", padding: "14px 16px", margin: "12px 0", fontSize: 13, color: "var(--danger)" }}>
            <strong>あとN日</strong> と表示され、カード全体が強調されます
          </div>
          <p style={{ marginTop: 8 }}>アラートが表示される条件：</p>
          <ul>
            <li>納期まで<strong>7日以内</strong>（当日含む）</li>
            <li>ステータスが<strong>完成・キャンセル以外</strong>のタスク</li>
          </ul>
        </Section>

        <Section title="プッシュ通知">
          <p>納期が近いタスクを<strong>毎朝8時にプッシュ通知</strong>でお知らせします。</p>
          <div style={{ background: "var(--success-soft)", borderRadius: "var(--radius-md)", padding: "14px 16px", margin: "12px 0", fontSize: 13, color: "var(--success)" }}>
            ホーム画面に追加したPWAでも通知が届きます（iOS 16.4以降）
          </div>
          <p style={{ marginTop: 8 }}>通知の設定方法：</p>
          <Step num={1} title="通知をオンにする">
            右上のユーザーメニュー →「通知オフ（タップでオン）」をタップして通知を許可してください。
          </Step>
          <Step num={2} title="通知が届くタイミング">
            納期まで7日以内のタスクがある場合、毎朝8時に通知が届きます。納期当日まで毎日届きます。
          </Step>
          <Step num={3} title="通知をオフにするには">
            ユーザーメニュー →「通知オン（タップでオフ）」をタップして通知を許可してください。
          </Step>
          <div style={{ background: "var(--warn-soft)", borderRadius: "var(--radius-md)", padding: "14px 16px", margin: "12px 0", fontSize: 13, color: "var(--warn)" }}>
            iOSのSafariでは、ブラウザの通知設定で「常に許可」にしていても、ホーム画面に追加したPWAでないと通知が届きません。必ず「ホーム画面に追加」してお使いください。
          </div>
        </Section>

        <Section title="画像のプラン制限">
          <p>プランによってアップロードできる画像の合計枚数が異なります。</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 12 }}>
            {[
              { label: "無料", limit: "10枚まで" },
              { label: "スタンダード", limit: "50枚まで" },
              { label: "プレミアム", limit: "無制限" },
            ].map(p => (
              <div key={p.label} className="card" style={{ padding: 12, textAlign: "center" }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{p.label}</div>
                <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>{p.limit}</div>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 12, fontSize: 13, color: "var(--muted)" }}>
            プランのアップグレードは右上のユーザーメニュー →「プランをアップグレード」から行えます。
          </p>
        </Section>

        <Section title="スマホで使う">
          <p>SafariやChromeの「ホーム画面に追加」からアプリとして使えます。アドレスバーが非表示になり、より快適に操作できます。</p>
        </Section>

        <Section title="アカウントを削除したいとき">
          <p>ユーザーメニュー →「アカウント削除を申請」から削除申請を送信できます。管理者が確認後、アカウントとすべてのデータを削除します。</p>
        </Section>

      </main>
    </div>
  );
}

// 使い方ガイドのセクション
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="doc-section">
      <h2>{title}</h2>
      <div>{children}</div>
    </div>
  );
}

// 使い方ガイドのステップ
function Step({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <div className="step-row">
      <div className="step-number">{num}</div>
      <div>
        <div className="step-title">{title}</div>
        <div className="step-body">{children}</div>
      </div>
    </div>
  );
}

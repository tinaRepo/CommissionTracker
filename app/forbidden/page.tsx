import SystemMessage from "@/components/SystemMessage";

export default function ForbiddenPage() {
  return (
    <SystemMessage
      code="403"
      title="このページを表示する権限がありません"
      description="このページは管理者専用です。権限のあるアカウントでログインするか、ホームへお戻りください。"
    />
  );
}
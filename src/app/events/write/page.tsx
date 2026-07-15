import { LoginRequired } from '@/components/LoginRequired';
import { EventWriteForm } from '@/components/events/EventWriteForm';
import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';
import { getServerUser } from '@/lib/apiServer';

export const dynamic = 'force-dynamic';

export const metadata = { title: '이벤트 글쓰기 | 아르보TCG' };

export default async function Page() {
  const user = await getServerUser();
  if (!user?.id) {
    return (
      <LoginRequired
        title="이벤트 글쓰기"
        message="글 작성은 로그인 후 가능합니다"
        callbackUrl="/events/write"
      />
    );
  }
  return (
    <>
      <StatusBar />
      <AppBar title="이벤트 글쓰기" showBack backHref="/events" />
      <div style={{ height: 14 }} />
      <EventWriteForm />
      <div className="bggap" />
    </>
  );
}

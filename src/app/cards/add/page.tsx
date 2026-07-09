import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '카드 추가 · CardVault',
  description: '카드 정보를 직접 입력해 컬렉션에 추가합니다.',
};

export default function Page() {
  redirect('/cards/add/manual');
}

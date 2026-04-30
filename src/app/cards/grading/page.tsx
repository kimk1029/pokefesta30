import { CardGrader } from '@/components/grading/CardGrader';
import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '카드 센터링 추정 · 포케페스타30',
  description: '포켓몬 카드 사진을 올리면 센터링을 추정해서 PSA 예상 등급을 보여줍니다.',
};

export default function Page() {
  return (
    <>
      <StatusBar />
      <AppBar title="카드 그레이딩 (센터링 추정)" showBack backHref="/cards" />
      <div style={{ height: 14 }} />
      <CardGrader />
      <div className="bggap" />
    </>
  );
}

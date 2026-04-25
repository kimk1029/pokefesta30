import { OripaScreen } from '@/components/screens/OripaScreen';
import { getActiveOripaBoxes } from '@/lib/oripa';

// 박스 목록만 ISR — 티켓 그리드는 play 페이지에서 8s 폴링으로 갱신.
export const revalidate = 30;

export default async function Page() {
  const boxes = await getActiveOripaBoxes();
  return <OripaScreen boxes={boxes} />;
}

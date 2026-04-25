import { OripaScreen } from '@/components/screens/OripaScreen';
import { getActiveOripaBoxes } from '@/lib/oripa';

export const revalidate = 30;

export default async function Page() {
  const boxes = await getActiveOripaBoxes();
  return <OripaScreen boxes={boxes} />;
}

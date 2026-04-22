import { ReportScreen } from '@/components/screens/ReportScreen';
import { getPlaces } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const places = await getPlaces();
  return <ReportScreen places={places} />;
}

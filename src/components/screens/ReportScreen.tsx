import { WriteScreen } from './WriteScreen';
import type { Place } from '@/lib/types';

export function ReportScreen({ places }: { places: Place[] }) {
  return <WriteScreen mode="report" places={places} />;
}

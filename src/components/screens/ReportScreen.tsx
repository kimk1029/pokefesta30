import { WriteScreen } from './WriteScreen';
import type { Place } from '@/lib/types';

/** /report 경로 호환 — 내부적으로 피드 작성(kind=report) 으로 열림 */
export function ReportScreen({ places }: { places: Place[] }) {
  return <WriteScreen mode="feed" defaultKind="report" places={places} />;
}

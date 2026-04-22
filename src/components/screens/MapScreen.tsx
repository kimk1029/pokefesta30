import { MapView } from '@/components/MapView';
import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';
import type { Place, Trade } from '@/lib/types';

interface Props {
  places: Place[];
  trades: Trade[];
}

export function MapScreen({ places, trades }: Props) {
  return (
    <>
      <StatusBar />
      <AppBar title="장소 지도" showBack />
      <div style={{ height: 14 }} />
      <MapView places={places} trades={trades} />
      <div className="bggap" />
    </>
  );
}

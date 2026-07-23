// 웹 /cards/add 와 동일 — 선택 화면 없이 직접입력 폼으로 즉시 리다이렉트.
// (스캔 진입은 탭/그레이딩 라우트가 담당 — 웹 ManualAddForm 헤더의 '스캔' 버튼과 동일하게
//  직접입력 화면 안에서도 스캔으로 넘어갈 수 있다.)
import { Redirect } from 'expo-router';

export default function CardAddScreen() {
  return <Redirect href={'/scan?mode=manual' as never} />;
}

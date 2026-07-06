/**
 * /messages — 실 쪽지함(/my/messages)으로 리다이렉트.
 * 과거 목업 인박스 라우트를 유지하되 웹과 동일하게 실 인박스 하나로 통일.
 */
import { Redirect } from 'expo-router';

export default function MessagesRedirect() {
  return <Redirect href="/my/messages" />;
}

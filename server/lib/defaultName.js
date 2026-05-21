export function defaultNameFor(userId) {
  if (!userId) return '트레이너';
  const short = String(userId).replace(/-/g, '').slice(-6).toLowerCase();
  return `트레이너${short}`;
}

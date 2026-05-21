import * as kakao from './kakao.js';
import * as naver from './naver.js';
import * as google from './google.js';

const PROVIDERS = { kakao, naver, google };

export function getProvider(name) {
  return PROVIDERS[name] ?? null;
}

export const supportedProviders = Object.keys(PROVIDERS);

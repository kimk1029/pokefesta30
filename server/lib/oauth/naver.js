const AUTHORIZE_URL = 'https://nid.naver.com/oauth2.0/authorize';
const TOKEN_URL = 'https://nid.naver.com/oauth2.0/token';
const USERINFO_URL = 'https://openapi.naver.com/v1/nid/me';

function env() {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  const redirectUri = process.env.NAVER_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) throw new Error('Naver OAuth env missing');
  return { clientId, clientSecret, redirectUri };
}

export function buildAuthorizeUrl(state) {
  const { clientId, redirectUri } = env();
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeCode(code, state) {
  const { clientId, clientSecret } = env();
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    code,
    state,
  });
  const res = await fetch(`${TOKEN_URL}?${params.toString()}`, { method: 'GET' });
  if (!res.ok) throw new Error(`naver token exchange ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(`naver token error: ${data.error_description ?? data.error}`);
  return data.access_token;
}

export async function fetchUserInfo(accessToken) {
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`naver userinfo ${res.status}`);
  const data = await res.json();
  const r = data.response ?? {};
  return {
    id: String(r.id),
    email: r.email,
    name: r.nickname ?? r.name,
  };
}

export const provider = 'naver';

const { getDefaultConfig } = require('expo/metro-config');
const http = require('node:http');
const path = require('node:path');

const config = getDefaultConfig(__dirname);

// 모바일/웹이 같은 데이터(cardPacks, pokemonSetMap)를 공유하도록 repo 루트의
// /shared 폴더를 Metro 의 watchFolders 에 추가. 추가 안 하면 mobile/src/data
// shim 이 '../../../shared/...' 를 require 할 때 변경 감지/HMR 이 끊긴다.
const SHARED_DIR = path.resolve(__dirname, '..', 'shared');
config.watchFolders = [...(config.watchFolders ?? []), SHARED_DIR];

// Proxy /api/* requests through Metro to the local OCR server (default :3001).
// This lets the phone reach the OCR server through the same Expo tunnel,
// so we don't need a second public tunnel.
const OCR_HOST = process.env.OCR_HOST || '127.0.0.1';
const OCR_PORT = Number(process.env.OCR_PORT || 3001);

config.server = config.server || {};
const prevEnhance = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const wrapped = prevEnhance ? prevEnhance(middleware, server) : middleware;
  return (req, res, next) => {
    if (req.url && req.url.startsWith('/api/')) {
      const opts = {
        hostname: OCR_HOST,
        port: OCR_PORT,
        path: req.url,
        method: req.method,
        headers: { ...req.headers, host: `${OCR_HOST}:${OCR_PORT}` },
      };
      const proxied = http.request(opts, (pr) => {
        res.writeHead(pr.statusCode || 502, pr.headers);
        pr.pipe(res);
      });
      proxied.on('error', (err) => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            candidates: [],
            needsUserSelection: false,
            message: `OCR 서버 연결 실패 (${err.code || 'ERR'})`,
          }),
        );
      });
      req.pipe(proxied);
      return;
    }
    return wrapped(req, res, next);
  };
};

module.exports = config;

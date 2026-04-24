/**
 * pm2 ecosystem — 메인 앱 + admin 두 인스턴스를 동시에 기동.
 *
 * 사용법:
 *   pm2 start ecosystem.config.cjs              # 두 앱 모두
 *   pm2 start ecosystem.config.cjs --only admin # admin 만
 *   pm2 reload ecosystem.config.cjs             # 무중단 재시작
 *   pm2 logs pokefesta30-app|pokefesta30-admin
 *
 * 각 앱은 자기 디렉터리에서 npm start 로 실행되며, .env 는 cwd 기준으로 읽힘.
 * admin 은 /.env 또는 admin/.env.local 에 ADMIN_USERNAME, ADMIN_PASSWORD, DATABASE_URL 필요.
 */

module.exports = {
  apps: [
    {
      name: 'pokefesta30-app',
      cwd: __dirname,
      script: 'npm',
      args: 'run start',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.APP_PORT || '3000',
      },
    },
    {
      name: 'pokefesta30-admin',
      cwd: __dirname + '/admin',
      script: 'npm',
      args: 'run start',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.ADMIN_PORT || '3010',
      },
    },
  ],
};

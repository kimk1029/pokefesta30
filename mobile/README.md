# 포케페스타30 Mobile (React Native / Expo)

루트 Next.js 웹앱(`pokefesta30`)의 디자인을 React Native로 포팅한 모바일 앱.

## 개발

```bash
cd mobile
npm install
npm start            # Metro bundler — 큐알 찍어 Expo Go에서 실행
npm run web          # 브라우저에서 미리보기
npm run android      # 안드로이드 디바이스/에뮬레이터
npm run ios          # iOS 시뮬레이터 (mac 필요)
```

## 빌드

```bash
npm run build:web      # web 정적 번들 → dist/
npm run build:bundle   # 안드로이드용 JS 번들 → dist-android/
```

> 네이티브 APK/IPA를 만들려면 `npx expo prebuild` 후 Android Studio / Xcode 또는
> EAS Build (`eas build -p android`)를 사용하세요.

## 구조

```
mobile/
├── app/                     # expo-router 라우트
│   ├── _layout.tsx          # 루트 레이아웃 + FAB 메뉴
│   ├── index.tsx            # 홈 (Hero / Quick / 혼잡도 / 피드)
│   ├── live.tsx             # 현황
│   ├── trade.tsx            # 거래
│   ├── my.tsx               # 마이
│   ├── cards.tsx            # 시세
│   ├── map.tsx              # 지도
│   └── write/{feed,trade}.tsx
├── src/
│   ├── components/          # PixelBox/PixelButton/PixelText/StatusBar/AppBar/Tabbar 등
│   ├── theme/tokens.ts      # 디자인 토큰 (globals.css :root와 1:1)
│   └── lib/{data,types}.ts  # mock 데이터
├── app.json                 # Expo 설정
└── package.json
```

## git

이 디렉토리는 루트 `.gitignore`에 의해 git에서 제외됩니다.
별도 저장소로 관리하세요:

```bash
cd mobile
git init && git add . && git commit -m "init pokefesta30 mobile"
```

import { AppBar } from '@/components/ui/AppBar';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { StatusBar } from '@/components/ui/StatusBar';

export const dynamic = 'force-dynamic';

interface QA {
  q: string;
  a: string;
}

const FAQ: Array<{ title: string; items: QA[] }> = [
  {
    title: '계정 / 로그인',
    items: [
      {
        q: '닉네임은 어떻게 바꾸나요?',
        a: '마이페이지 → 이름 옆 연필 아이콘 → 새 이름 입력 후 저장. 2~20자까지 가능합니다.',
      },
      {
        q: '로그인이 안돼요. 카카오톡에서 열면 "Unable to log in" 이 떠요.',
        a: '카카오톡·네이버앱 같은 내장 브라우저는 OAuth 로그인이 차단됩니다. 우측 상단 메뉴에서 "Chrome/Safari 로 열기" 선택해주세요.',
      },
      {
        q: '이메일/포인트가 사라졌어요.',
        a: '처음 로그인 직후엔 DB 동기화에 잠시 시간이 걸릴 수 있습니다. 새로고침 후에도 이상하면 공지 하단 문의 링크로 알려주세요.',
      },
    ],
  },
  {
    title: '거래 / 제보',
    items: [
      {
        q: '거래글 작성 후 완료 처리는 어떻게 하나요?',
        a: '거래글 상세 페이지 → 본인 글이면 "거래 완료" 버튼 노출. 완료된 글은 목록에서 흐리게 표시되고, 상단 토글로 숨기거나 다시 볼 수 있습니다.',
      },
      {
        q: '제보하면 포인트가 얼마나 쌓이나요?',
        a: '혼잡도 제보 +20P, 일반 피드 +10P, 거래글 작성 +30P, 거래 완료 +100P 입니다.',
      },
      {
        q: '가격은 어떻게 입력하나요?',
        a: '숫자만 입력하면 자동으로 1,000 단위 콤마가 찍히고, "제안"·"정가"·"1.5만" 같은 텍스트도 그대로 저장됩니다.',
      },
    ],
  },
  {
    title: '스탬프 랠리 / 오리파',
    items: [
      {
        q: '스탬프는 어디서 찍나요?',
        a: '지도 탭 → 실제 지도에서 6곳 포켓스탑 위치 확인. 현장에서 운영진 안내에 따라 스탬프를 모으시면 됩니다.',
      },
      {
        q: '오리파 뽑기 결과는 다른 사람과 공유되나요?',
        a: '네 — 100칸은 전체 유저가 공유합니다. 내가 뽑은 자리는 다른 사람에게도 뽑힌 상태로 보입니다. 8초마다 자동 동기화.',
      },
      {
        q: '오리파 뽑는 데 사용한 포인트는 어떻게 충전하나요?',
        a: '마이페이지 → 포케30 상점 → 충전 패키지 구매. 추후 무료 충전(광고 시청) 기능 예정.',
      },
    ],
  },
  {
    title: '지도 / 위치',
    items: [
      {
        q: '내 위치가 안 뜹니다.',
        a: 'HTTPS 로 접속 + 브라우저 위치 권한 허용이 필요합니다. 주소창 왼쪽 🔒 아이콘 → 권한 → 위치 허용.',
      },
      {
        q: '지도 마커 위치가 살짝 어긋나요.',
        a: '네이버 Geocoder 로 주소→좌표 변환 결과를 사용합니다. 수 m 오차가 있을 수 있어 현장에서는 주변 간판/건물 기준으로 확인 부탁드립니다.',
      },
    ],
  },
  {
    title: '기타',
    items: [
      {
        q: '문의는 어디로 보내나요?',
        a: '공지사항 하단 이메일 또는 거래 완료 후 쪽지로 보내주세요. 운영팀이 1~2일 내 답변드립니다.',
      },
      {
        q: '개인정보는 어떻게 처리하나요?',
        a: '이메일/닉네임만 저장하며, 광고/마케팅 용도로 외부 공유하지 않습니다. 탈퇴 요청 시 즉시 삭제 처리.',
      },
    ],
  },
];

export default function Page() {
  return (
    <>
      <StatusBar />
      <AppBar title="FAQ · 자주 묻는 질문" showBack backHref="/my" />

      <div style={{ height: 14 }} />

      {FAQ.map((section) => (
        <div className="sect" key={section.title}>
          <SectionTitle title={section.title} />
          {section.items.map((it, i) => (
            <details
              key={i}
              style={{
                margin: '0 0 8px',
                padding: '10px 12px',
                background: 'var(--white)',
                boxShadow:
                  '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),3px 3px 0 var(--ink)',
              }}
            >
              <summary
                style={{
                  fontFamily: 'var(--f1)',
                  fontSize: 9,
                  letterSpacing: 0.3,
                  cursor: 'pointer',
                  listStyle: 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span>
                  <span style={{ color: 'var(--red)', marginRight: 6 }}>Q.</span>
                  {it.q}
                </span>
                <span style={{ fontSize: 8, color: 'var(--ink3)' }}>▼</span>
              </summary>
              <div
                style={{
                  marginTop: 10,
                  paddingTop: 10,
                  borderTop: '1px dashed rgba(0,0,0,.15)',
                  fontFamily: 'var(--f1)',
                  fontSize: 8,
                  lineHeight: 1.8,
                  color: 'var(--ink2)',
                  letterSpacing: 0.3,
                }}
              >
                <span style={{ color: 'var(--blu)', marginRight: 6 }}>A.</span>
                {it.a}
              </div>
            </details>
          ))}
        </div>
      ))}

      <div className="bggap" />
    </>
  );
}

import { AppHeader } from '@/components/AppHeader';
import { StatusBar } from '@/components/StatusBar';

export function MyScreen() {
  return (
    <>
      <StatusBar />
      <AppHeader />
      <div className="screen-title-bar">
        <div>
          <h1>마이페이지</h1>
        </div>
        <button type="button" className="icon-btn">⚙</button>
      </div>

      <div className="profile-card">
        <div className="profile-avatar">🐣</div>
        <div className="profile-info">
          <div className="name">트레이너_24</div>
          <div className="meta">제보 12 · 신뢰도 ★★★★☆</div>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat-card">
          <div className="n">12</div>
          <div className="l">내 제보</div>
        </div>
        <div className="stat-card">
          <div className="n">3</div>
          <div className="l">내 거래</div>
        </div>
        <div className="stat-card">
          <div className="n">7</div>
          <div className="l">찜한 글</div>
        </div>
      </div>

      <div className="section">
        <div className="section-title"><h2>내 활동</h2></div>
        <div className="my-list-item">
          <div className="icon">📝</div>
          <div className="main">내가 쓴 거래글</div>
          <span className="arrow">▶</span>
        </div>
        <div className="my-list-item">
          <div className="icon" style={{ background: '#FB923C' }}>📢</div>
          <div className="main">내가 올린 제보</div>
          <span className="arrow">▶</span>
        </div>
        <div className="my-list-item">
          <div className="icon" style={{ background: '#3A5BD9' }}>💛</div>
          <div className="main">찜한 글</div>
          <span className="arrow">▶</span>
        </div>
      </div>

      <div className="section">
        <div className="section-title"><h2>설정</h2></div>
        <div className="my-list-item">
          <div className="icon" style={{ background: '#F7F3E3' }}>🔔</div>
          <div className="main">알림 설정</div>
          <span className="arrow">▶</span>
        </div>
        <div className="my-list-item">
          <div className="icon" style={{ background: '#F7F3E3' }}>ℹ</div>
          <div className="main">공지사항 · FAQ</div>
          <span className="arrow">▶</span>
        </div>
      </div>
      <div style={{ height: 20 }} />
    </>
  );
}

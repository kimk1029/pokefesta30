import { FeedRow } from '@/components/FeedRow';
import { AppBar } from '@/components/ui/AppBar';
import { IconButton } from '@/components/ui/IconButton';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { StatusBar } from '@/components/ui/StatusBar';
import type { FeedPost } from '@/lib/types';

export function FeedScreen({ posts }: { posts: FeedPost[] }) {
  return (
    <>
      <StatusBar />
      <AppBar
        title="피드"
        right={
          <IconButton aria-label="검색">
            🔍
          </IconButton>
        }
      />

      <div style={{ height: 14 }} />
      <div className="sect">
        <SectionTitle title="현장 피드" right={<span className="more">잡담 · 최신순</span>} />
        {posts.length === 0 ? (
          <div className="feed-item">
            <div className="fi-body">
              <div className="fi-text">아직 피드가 없어요. 첫 번째가 되어보세요!</div>
            </div>
          </div>
        ) : (
          posts.map((p) => <FeedRow key={p.id} post={p} />)
        )}
      </div>
      <div className="bggap" />
    </>
  );
}

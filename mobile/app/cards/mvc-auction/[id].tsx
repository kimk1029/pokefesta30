import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppBar } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { PixelFrame } from '@/components/cv/PixelFrame';
import { PixelPress } from '@/components/cv/PixelPress';
import { SectHd } from '@/components/cv/SectHd';
import { colors } from '@/theme/tokens';
import { fetchMvcArticle, type MvcArticleDetail, type MvcCommentItem } from '@/services/marketplace';

/** 본문 이미지 — 원본 비율을 유지해 폭 100%로 렌더(웹 width:100% height:auto 재현). */
function ArticleImage({ uri }: { uri: string }) {
  const [ratio, setRatio] = useState(0);
  useEffect(() => {
    let alive = true;
    Image.getSize(
      uri,
      (w, h) => {
        if (alive && w > 0 && h > 0) setRatio(w / h);
      },
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, [uri]);
  return (
    <Image
      source={{ uri }}
      style={{ width: '100%', aspectRatio: ratio || 1, borderWidth: 2, borderColor: colors.pap3, backgroundColor: colors.ink2 }}
      resizeMode="cover"
    />
  );
}

/** 현재 최종호가 배너 — 가장 최근 댓글을 경매 현재가처럼 표시. */
function TopBidBanner({ article }: { article: MvcArticleDetail }) {
  const bid = article.latestBid;
  return (
    <PixelFrame bg={colors.red} border={colors.ink} borderWidth={3} shadow={6} hi="rgba(255,255,255,0.22)" lo="rgba(0,0,0,0.36)" style={{ marginBottom: 14 }}>
      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <PixelText variant="pixel" size={9} color={colors.gold} style={{ letterSpacing: 0.5 }}>
            🔨 현재 최종호가
          </PixelText>
          <PixelText variant="pixel" size={8} color="rgba(255,255,255,0.85)">
            입찰 {article.commentCount}건
          </PixelText>
        </View>
        {bid ? (
          <>
            <PixelText variant="ko" size={18} weight="bold" color={colors.white} numberOfLines={3} style={{ marginTop: 8, lineHeight: 24 }}>
              {bid.content || (article.latestBidAmount != null ? `${article.latestBidAmount.toLocaleString('ko-KR')}원` : '')}
            </PixelText>
            <PixelText variant="pixel" size={8} color="rgba(255,255,255,0.85)" style={{ marginTop: 8 }}>
              {bid.writerNickname || '익명'} · {bid.writtenAgo}
            </PixelText>
          </>
        ) : (
          <PixelText variant="ko" size={12} color="rgba(255,255,255,0.92)" style={{ marginTop: 10, lineHeight: 18 }}>
            아직 입찰이 없습니다 — 첫 입찰을 노려보세요!
          </PixelText>
        )}
      </View>
    </PixelFrame>
  );
}

function CommentRow({ c, isTop }: { c: MvcCommentItem; isTop: boolean }) {
  return (
    <View
      style={{
        padding: 10,
        marginBottom: 8,
        backgroundColor: isTop ? 'rgba(230,57,70,0.06)' : colors.pap2,
        borderWidth: isTop ? 2 : 1,
        borderColor: isTop ? colors.red : colors.pap3,
        opacity: c.deleted ? 0.5 : 1,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
        {isTop && (
          <View style={{ backgroundColor: colors.red, paddingHorizontal: 5, paddingVertical: 1 }}>
            <PixelText variant="pixel" size={7} color={colors.white}>
              최종호가
            </PixelText>
          </View>
        )}
        <PixelText variant="ko" size={11} color={colors.ink}>
          {c.writerNickname || '익명'}
        </PixelText>
        {c.byArticleWriter && (
          <View style={{ backgroundColor: colors.gold, paddingHorizontal: 4, paddingVertical: 1 }}>
            <PixelText variant="pixel" size={7} color={colors.ink}>
              판매자
            </PixelText>
          </View>
        )}
        <PixelText variant="pixel" size={7} color={colors.ink3} style={{ marginLeft: 'auto' }}>
          {c.writtenAgo}
        </PixelText>
      </View>
      <PixelText variant="ko" size={isTop ? 13 : 12} weight={isTop ? 'bold' : 'normal'} color={isTop ? colors.red : colors.ink} style={{ lineHeight: isTop ? 19 : 18 }}>
        {c.content}
      </PixelText>
    </View>
  );
}

export default function MvcArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const articleId = Number(id);
  const [article, setArticle] = useState<MvcArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setFailed(false);
    if (!Number.isInteger(articleId) || articleId <= 0) {
      setLoading(false);
      setFailed(true);
      return;
    }
    fetchMvcArticle(articleId)
      .then((a) => {
        if (!alive) return;
        setArticle(a);
        setFailed(!a);
      })
      .catch(() => {
        if (alive) setFailed(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [articleId]);

  // 입찰 내역은 최신순(맨 위가 최종호가).
  const bids = article ? [...article.comments].reverse() : [];
  const topBidId = article?.latestBid?.id ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <AppBar onBack={() => router.back()} title="MVC 경매" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 80 }}>
        {loading ? (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <ActivityIndicator color={colors.ink} />
          </View>
        ) : !article ? (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <PixelText variant="ko" size={12} color={colors.ink3} style={{ textAlign: 'center', lineHeight: 20 }}>
              {failed ? '글을 불러오지 못했습니다.\n삭제되었거나 일시적인 오류일 수 있어요.' : ''}
            </PixelText>
          </View>
        ) : (
          <>
            {/* 제목 + 메타 */}
            <PixelText variant="ko" size={15} weight="bold" style={{ lineHeight: 22 }}>
              {article.subject}
            </PixelText>
            <PixelText variant="pixel" size={8} color={colors.ink3} style={{ marginTop: 8 }}>
              {article.writerNickname}   ·   {article.writtenAgo}   ·   👁 {article.readCount}
            </PixelText>

            <View style={{ height: 14 }} />
            <TopBidBanner article={article} />

            {/* 본문 이미지 */}
            {article.images.length > 0 && (
              <View style={{ gap: 10, marginBottom: 14 }}>
                {article.images.map((src) => (
                  <ArticleImage key={src} uri={src} />
                ))}
              </View>
            )}

            {/* 본문 텍스트 */}
            {article.contentText ? (
              <View style={{ backgroundColor: colors.pap2, padding: 14, marginBottom: 14, borderWidth: 2, borderColor: colors.pap3 }}>
                <PixelText variant="ko" size={12} color={colors.ink} style={{ lineHeight: 19 }}>
                  {article.contentText}
                </PixelText>
              </View>
            ) : null}

            {/* 입찰 내역 */}
            <SectHd title={`입찰 내역 ${bids.length}`} />
            {bids.length === 0 ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <PixelText variant="ko" size={11} color={colors.ink3}>
                  아직 입찰(댓글)이 없습니다.
                </PixelText>
              </View>
            ) : (
              bids.map((c) => <CommentRow key={c.id} c={c} isTop={c.id === topBidId} />)
            )}

            {/* 네이버 카페 원문 */}
            <PixelPress
              onPress={() => Linking.openURL(article.sourceUrl)}
              bg={colors.grn}
              borderWidth={3}
              shadow={5}
              hi={null}
              lo={null}
              wrapStyle={{ marginTop: 10 }}
            >
              <View style={{ paddingVertical: 13, alignItems: 'center' }}>
                <PixelText variant="ko" size={11} color={colors.white}>
                  네이버 카페에서 입찰하기 →
                </PixelText>
              </View>
            </PixelPress>
          </>
        )}
      </ScrollView>
    </View>
  );
}

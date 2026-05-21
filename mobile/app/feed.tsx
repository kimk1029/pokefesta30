import { useState } from 'react';
import { ScrollView, View, Pressable, Text } from 'react-native';
import { router } from 'expo-router';
import { AppBar, ABtn } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { CardThumb } from '@/components/cv/CardThumb';
import { RarBadge } from '@/components/cv/RarBadge';
import { Seg } from '@/components/cv/Seg';
import { PixelFrame } from '@/components/cv/PixelFrame';
import { PixelPress } from '@/components/cv/PixelPress';
import { colors } from '@/theme/tokens';
import { POSTS, MARKET, CARDS, fmt } from '@/data/cardvault';

type Tab = 'feed' | 'market' | 'grade-req';
type MktTab = 'all' | 'sell' | 'buy' | 'trade';

export default function CommunityScreen() {
  const [tab, setTab] = useState<Tab>('feed');
  const [mktTab, setMktTab] = useState<MktTab>('all');
  const [liked, setLiked] = useState<Record<number, boolean>>({});

  const mktList = MARKET.filter((m) => mktTab === 'all' || m.type === mktTab);

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <AppBar title="커뮤니티" right={<ABtn onPress={() => router.push('/write/feed' as never)}>✏</ABtn>} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 14, paddingBottom: 120 }}>
        <View style={{ marginHorizontal: 14 }}>
          <Seg
            value={tab}
            onChange={(t) => setTab(t)}
            tabs={[
              { id: 'feed', label: '피드' },
              { id: 'market', label: '🏷 마켓' },
              { id: 'grade-req', label: '감정 요청' },
            ]}
            size={10}
          />
        </View>

        {tab === 'feed' && (
          <View style={{ paddingHorizontal: 14, marginTop: 14 }}>
            {POSTS.filter((p) => p.type !== 'grade-req').map((post) => (
              <View key={post.id} style={{ marginBottom: 14 }}>
              <PixelFrame borderWidth={3} shadow={5}>
              <View style={{ padding: 12 }}>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      backgroundColor: colors.gold,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderColor: colors.ink,
                      borderWidth: 2,
                    }}
                  >
                    <Text style={{ fontSize: 18 }}>{post.avatar}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <PixelText variant="pixel" size={11} numberOfLines={1}>
                      {post.user}
                    </PixelText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 }}>
                      <View
                        style={{
                          backgroundColor: post.type === 'showcase' ? colors.red : colors.grn,
                          paddingHorizontal: 6,
                          height: 18,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderColor: colors.ink,
                          borderWidth: 1,
                        }}
                      >
                        <PixelText variant="pixel" size={8} color={post.type === 'showcase' ? colors.white : colors.ink}>
                          {post.type === 'showcase' ? '자랑' : '잡담'}
                        </PixelText>
                      </View>
                      <PixelText variant="pixel" size={9} color={colors.ink3}>
                        {post.time}
                      </PixelText>
                    </View>
                  </View>
                </View>

                <PixelText variant="ko" size={13} color={colors.ink2} style={{ lineHeight: 20, marginBottom: 4 }}>
                  {post.text}
                </PixelText>

                {post.hasCard && post.card ? (
                  <Pressable
                    onPress={() => router.push(`/cards/${post.card!.id}` as never)}
                    style={{ height: 96, marginTop: 10, borderColor: colors.ink, borderWidth: 2, overflow: 'hidden' }}
                  >
                    <CardThumb card={post.card} height={92} emojiSize={36} showLabel={false} />
                  </Pressable>
                ) : null}

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <PostAct
                    icon="♥"
                    label={String(post.likes + (liked[post.id] ? 1 : 0))}
                    active={liked[post.id]}
                    onPress={() => setLiked((l) => ({ ...l, [post.id]: !l[post.id] }))}
                  />
                  <PostAct icon="💬" label={String(post.comments)} />
                </View>
              </View>
              </PixelFrame>
              </View>
            ))}
          </View>
        )}

        {tab === 'market' && (
          <View>
            <View style={{ marginHorizontal: 14, marginTop: 14 }}>
              <Seg
                value={mktTab}
                onChange={(t) => setMktTab(t)}
                tabs={[
                  { id: 'all', label: '전체' },
                  { id: 'sell', label: '팝니다' },
                  { id: 'buy', label: '삽니다' },
                  { id: 'trade', label: '교환' },
                ]}
              />
            </View>
            <View style={{ paddingHorizontal: 14, marginTop: 14 }}>
              {mktList.map((m) => {
                const card = CARDS.find((c) => c.id === m.cardId) ?? CARDS[0];
                return (
                  <PixelPress
                    key={m.id}
                    onPress={() => router.push(`/cards/${card.id}` as never)}
                    wrapStyle={{ marginBottom: 12 }}
                  >
                    <View
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        flexDirection: 'row',
                        gap: 12,
                      }}
                    >
                      <View style={{ width: 52, height: 72, borderColor: colors.ink, borderWidth: 2 }}>
                        <CardThumb card={card} height={68} emojiSize={26} showLabel={false} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <PixelText variant="pixel" size={11} style={{ marginBottom: 6 }}>
                          {card.name}
                        </PixelText>
                        <PixelText variant="pixel" size={9} color={colors.ink3} style={{ marginBottom: 6 }}>
                          {card.set}
                        </PixelText>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                          <View
                            style={{
                              backgroundColor:
                                m.type === 'sell' ? colors.red : m.type === 'buy' ? colors.blu : colors.teal,
                              paddingHorizontal: 7,
                              paddingVertical: 3,
                              borderColor: colors.ink,
                              borderWidth: 1,
                            }}
                          >
                            <PixelText variant="pixel" size={9} color={colors.white}>
                              {m.type === 'sell' ? '팝니다' : m.type === 'buy' ? '삽니다' : '교환'}
                            </PixelText>
                          </View>
                          <RarBadge rar={card.rar} />
                          <PixelText variant="pixel" size={9} color={colors.ink3}>
                            {m.condition}
                          </PixelText>
                        </View>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginTop: 6,
                          }}
                        >
                          {m.price ? (
                            <PixelText variant="pixel" size={12} color={colors.grnDk}>
                              ₩{fmt(m.price)}
                            </PixelText>
                          ) : (
                            <PixelText variant="pixel" size={10} color={colors.ink3}>
                              협의
                            </PixelText>
                          )}
                          <PixelText variant="pixel" size={9} color={colors.ink3}>
                            {m.time} · {m.seller}
                          </PixelText>
                        </View>
                      </View>
                    </View>
                  </PixelPress>
                );
              })}
            </View>
          </View>
        )}

        {tab === 'grade-req' && (
          <View style={{ paddingHorizontal: 14, marginTop: 14 }}>
            {POSTS.filter((p) => p.type === 'grade-req').map((post) => (
              <View key={post.id} style={{ marginBottom: 14 }}>
              <PixelFrame borderWidth={3} shadow={5}>
              <View style={{ padding: 12 }}>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      backgroundColor: colors.gold,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderColor: colors.ink,
                      borderWidth: 2,
                    }}
                  >
                    <Text style={{ fontSize: 18 }}>{post.avatar}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <PixelText variant="pixel" size={11} numberOfLines={1}>
                      {post.user}
                    </PixelText>
                    <View style={{ flexDirection: 'row', gap: 5, marginTop: 5, alignItems: 'center' }}>
                      <View
                        style={{
                          backgroundColor: colors.orn,
                          paddingHorizontal: 6,
                          height: 18,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderColor: colors.ink,
                          borderWidth: 1,
                        }}
                      >
                        <PixelText variant="pixel" size={8} color={colors.white}>
                          감정 요청
                        </PixelText>
                      </View>
                      <PixelText variant="pixel" size={9} color={colors.ink3}>
                        {post.time}
                      </PixelText>
                    </View>
                  </View>
                </View>

                <PixelText variant="ko" size={13} color={colors.ink2} style={{ lineHeight: 20 }}>
                  {post.text}
                </PixelText>

                {post.hasCard && post.card ? (
                  <View style={{ height: 96, marginTop: 10, borderColor: colors.ink, borderWidth: 2, overflow: 'hidden' }}>
                    <CardThumb card={post.card} height={92} emojiSize={36} showLabel={false} />
                  </View>
                ) : null}

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'center' }}>
                  <PostAct icon="♥" label={String(post.likes)} />
                  <PostAct icon="💬" label={String(post.comments)} />
                  <View style={{ flex: 1 }} />
                  <PostAct icon="⏱" label="감정하기" bg={colors.pur} fg={colors.white} />
                </View>
              </View>
              </PixelFrame>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

interface ActProps {
  icon: string;
  label: string;
  active?: boolean;
  bg?: string;
  fg?: string;
  onPress?: () => void;
}

function PostAct({ icon, label, active, bg, fg, onPress }: ActProps) {
  return (
    <Pressable onPress={onPress}>
      <View
        style={{
          backgroundColor: bg ?? colors.pap2,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          paddingHorizontal: 8,
          paddingVertical: 5,
          borderColor: colors.ink,
          borderWidth: 2,
        }}
      >
        <Text style={{ fontSize: 12, color: active ? colors.red : fg ?? colors.ink3 }}>{icon}</Text>
        <PixelText variant="pixel" size={10} color={active ? colors.red : fg ?? colors.ink3}>
          {label}
        </PixelText>
      </View>
    </Pressable>
  );
}

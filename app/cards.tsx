import { useState } from 'react';
import { ScrollView, View, Pressable, TextInput, Text } from 'react-native';
import { router } from 'expo-router';
import { AppBar, ABtn } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { CardThumb } from '@/components/cv/CardThumb';
import { Chip } from '@/components/cv/Chip';
import { RarBadge } from '@/components/cv/RarBadge';
import { GradeBadge } from '@/components/cv/GradeBadge';
import { PixelFrame } from '@/components/cv/PixelFrame';
import { PixelPress } from '@/components/cv/PixelPress';
import { colors } from '@/theme/tokens';
import { GAMES, RARS, gameColors, fmt, priceLabel, displayCardName, inferCardCurrency, cardKrw, cardPrice, type Game, type Rarity } from '@/data/cardvault';
import { usePriceMode } from '@/lib/priceMode';
import { useCollection } from '@/lib/collection';

type View4 = 'grid' | 'list' | 'binder' | 'album';
type Sort = 'name' | 'price' | 'grade' | 'recent';

export default function Cards() {
  const [gameFilter, setGameFilter] = useState<string>('전체');
  const [rarFilter, setRarFilter] = useState<string>('전체');
  const [view, setView] = useState<View4>('grid');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<Sort>('name');
  const owned = useCollection();

  let filtered = owned.filter(
    (c) =>
      (gameFilter === '전체' || c.game === gameFilter) &&
      (rarFilter === '전체' || c.rar === rarFilter) &&
      (c.name.includes(search) || c.game.includes(search) || c.set.includes(search)),
  );
  const { mode: priceMode } = usePriceMode();
  if (sortBy === 'price') filtered = [...filtered].sort((a, b) => cardKrw(b, priceMode) - cardKrw(a, priceMode));
  if (sortBy === 'grade') filtered = [...filtered].sort((a, b) => (b.grade ?? 0) - (a.grade ?? 0));

  const totalVal = owned.reduce((a, c) => a + cardKrw(c, priceMode), 0);
  const gradedCnt = owned.filter((c) => c.grade != null).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <AppBar title="내 컬렉션" right={<ABtn onPress={() => router.push('/scan' as never)}>+</ABtn>} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 12, paddingBottom: 110 }}>
        {/* Summary strip */}
        <View style={{ marginHorizontal: 14, marginBottom: 12 }}>
          <PixelFrame borderWidth={3} hi={null} lo={null}>
            <View style={{ flexDirection: 'row' }}>
              {[
                { txt: `총 ${owned.length}장`, bg: colors.ink, col: colors.gold },
                { txt: `₩${fmt(totalVal)}`, bg: colors.goldDk, col: colors.ink },
                { txt: `${gradedCnt}건 그레이딩`, bg: colors.pur, col: colors.white },
              ].map((s, i) => (
                <View
                  key={s.txt}
                  style={{
                    flex: 1,
                    paddingVertical: 9,
                    paddingHorizontal: 8,
                    backgroundColor: s.bg,
                    alignItems: 'center',
                    borderRightWidth: i < 2 ? 3 : 0,
                    borderRightColor: colors.ink,
                  }}
                >
                  <PixelText variant="pixel" size={9} color={s.col}>
                    {s.txt}
                  </PixelText>
                </View>
              ))}
            </View>
          </PixelFrame>
        </View>

        {/* Search */}
        <View style={{ marginHorizontal: 14, marginBottom: 12 }}>
          <PixelFrame>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
              }}
            >
              <PixelText variant="pixel" size={12} color={colors.ink3}>
                🔍
              </PixelText>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="카드명, 세트, 게임 검색..."
                placeholderTextColor={colors.ink4}
                style={{
                  flex: 1,
                  paddingHorizontal: 8,
                  paddingVertical: 10,
                  fontSize: 15,
                  fontFamily: 'Galmuri11',
                  color: colors.ink,
                }}
              />
            </View>
          </PixelFrame>
        </View>

        {/* Game filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 14, gap: 6 }}
          style={{ marginBottom: 8 }}
        >
          {GAMES.map((g) => {
            const on = gameFilter === g;
            return (
              <Chip key={g} on={on} onPress={() => setGameFilter(g)} size={9} px={9} py={6}>
                {g === '전체' ? 'ALL' : g}
              </Chip>
            );
          })}
        </ScrollView>

        {/* Rarity filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 14, gap: 6 }}
          style={{ marginBottom: 8 }}
        >
          {(['전체', ...RARS] as string[]).map((r) => {
            const on = rarFilter === r;
            return (
              <Chip key={r} on={on} onPress={() => setRarFilter(r)} size={9} px={9} py={6}>
                {r === '전체' ? 'ALL' : r}
              </Chip>
            );
          })}
        </ScrollView>

        {/* Sort + View toggle */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginHorizontal: 14,
            marginBottom: 12,
          }}
        >
          <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap' }}>
            {(
              [
                ['name', '이름'],
                ['price', '가격'],
                ['grade', '등급'],
                ['recent', '최근'],
              ] as const
            ).map(([k, lb]) => {
              const on = sortBy === k;
              return (
                <Pressable
                  key={k}
                  onPress={() => setSortBy(k as Sort)}
                  style={{
                    paddingHorizontal: 9,
                    paddingVertical: 6,
                    backgroundColor: on ? colors.ink : colors.white,
                    borderColor: colors.ink,
                    borderWidth: 2,
                    marginRight: 4,
                    marginBottom: 4,
                  }}
                >
                  <PixelText variant="pixel" size={9} color={on ? colors.gold : colors.ink}>
                    {lb}
                  </PixelText>
                </Pressable>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', gap: 3 }}>
            {(
              [
                ['grid', '⊞'],
                ['list', '☰'],
                ['binder', '📒'],
                ['album', '🎞'],
              ] as const
            ).map(([v, icon]) => {
              const on = view === v;
              return (
                <Pressable
                  key={v}
                  onPress={() => setView(v as View4)}
                  style={{
                    width: 28,
                    height: 28,
                    backgroundColor: on ? colors.ink : colors.white,
                    borderColor: colors.ink,
                    borderWidth: 2,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 14, color: on ? colors.gold : colors.ink }}>{icon}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Views */}
        {view === 'grid' && (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              marginHorizontal: 14,
              gap: 10,
            }}
          >
            {filtered.map((card) => (
              <View key={card.id} style={{ width: '47%' }}>
                <PixelPress onPress={() => router.push(`/cards/${card.id}` as never)}>
                  <View>
                    <CardThumb card={card} height={150} emojiSize={44} />
                    <View style={{ paddingHorizontal: 10, paddingVertical: 10, borderTopWidth: 3, borderTopColor: colors.ink }}>
                      <PixelText variant="pixel" size={10} numberOfLines={1} style={{ marginBottom: 6 }}>
                        {displayCardName(card.name)}
                      </PixelText>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <RarBadge rar={card.rar} size={9} px={6} py={3} />
                        <View style={{ flex: 1 }} />
                        {card.grade ? <GradeBadge g={card.grade} size={24} /> : null}
                      </View>
                      <PixelText variant="pixel" size={11} color={colors.grnDk} style={{ marginTop: 6 }}>
                        {priceLabel(cardPrice(card, priceMode), inferCardCurrency(card))}
                      </PixelText>
                    </View>
                  </View>
                </PixelPress>
              </View>
            ))}
          </View>
        )}

        {view === 'list' && (
          <View style={{ marginHorizontal: 14 }}>
            {filtered.map((card) => (
              <PixelPress
                key={card.id}
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
                      {displayCardName(card.name)}
                    </PixelText>
                    <PixelText variant="pixel" size={9} color={colors.ink3} style={{ marginBottom: 6 }}>
                      {card.set} · {card.num}
                    </PixelText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <RarBadge rar={card.rar} />
                      <View
                        style={{
                          backgroundColor: gameColors[card.game],
                          paddingHorizontal: 5,
                          paddingVertical: 2,
                          borderColor: colors.ink,
                          borderWidth: 1,
                        }}
                      >
                        <PixelText variant="pixel" size={8} color={colors.white}>
                          {card.game}
                        </PixelText>
                      </View>
                      {card.grade ? (
                        <View
                          style={{
                            backgroundColor: colors.gold,
                            paddingHorizontal: 5,
                            paddingVertical: 2,
                            borderColor: colors.ink,
                            borderWidth: 1,
                          }}
                        >
                          <PixelText variant="pixel" size={8} color={colors.ink}>
                            PSA {card.grade}
                          </PixelText>
                        </View>
                      ) : null}
                    </View>
                    <PixelText variant="pixel" size={11} color={colors.grnDk} style={{ marginTop: 5 }}>
                      {priceLabel(cardPrice(card, priceMode), inferCardCurrency(card))}
                    </PixelText>
                  </View>
                </View>
              </PixelPress>
            ))}
          </View>
        )}

        {view === 'binder' && (
          <View style={{ marginHorizontal: 14 }}>
          <PixelFrame bg={colors.pap3} borderWidth={4} hi="rgba(255,255,255,0.3)" lo="rgba(0,0,0,0.2)" inner={3}>
          <View style={{ padding: 12 }}>
            <PixelText
              variant="pixel"
              size={10}
              color={colors.ink}
              style={{ textAlign: 'center', marginBottom: 10 }}
            >
              📒 바인더 · {filtered.length}장
            </PixelText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
              {filtered.map((card) => (
                <Pressable
                  key={card.id}
                  onPress={() => router.push(`/cards/${card.id}` as never)}
                  style={{ width: '31.7%' }}
                >
                  <View
                    style={{
                      backgroundColor: colors.white,
                      borderColor: colors.ink,
                      borderWidth: 2,
                    }}
                  >
                    <View
                      style={{
                        height: 90,
                        backgroundColor: gameColors[card.game] + '55',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 28 }}>{card.emoji}</Text>
                    </View>
                    <View
                      style={{
                        padding: 4,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderTopColor: colors.ink,
                        borderTopWidth: 2,
                      }}
                    >
                      <PixelText variant="pixel" size={6} numberOfLines={1} style={{ flex: 1 }}>
                        {displayCardName(card.name)}
                      </PixelText>
                      {card.grade ? (
                        <PixelText variant="pixel" size={6} color={colors.goldDk}>
                          P{card.grade}
                        </PixelText>
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
          </PixelFrame>
          </View>
        )}

        {view === 'album' && (
          <View style={{ marginHorizontal: 14, gap: 16 }}>
            {GAMES.slice(1).map((g) => {
              const cards = filtered.filter((c) => c.game === g);
              if (!cards.length) return null;
              return (
                <View key={g}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      backgroundColor: gameColors[g as Game],
                      borderColor: colors.ink,
                      borderWidth: 3,
                      marginBottom: 8,
                    }}
                  >
                    <PixelText variant="pixel" size={11} color={colors.white} style={{ flex: 1, letterSpacing: 1 }}>
                      {g}
                    </PixelText>
                    <PixelText variant="pixel" size={10} color="rgba(255,255,255,0.7)">
                      {cards.length}장
                    </PixelText>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
                  >
                    {cards.map((card) => (
                      <Pressable
                        key={card.id}
                        onPress={() => router.push(`/cards/${card.id}` as never)}
                      >
                        <View
                          style={{
                            width: 80,
                            backgroundColor: colors.white,
                            borderColor: colors.ink,
                            borderWidth: 2,
                          }}
                        >
                          <View
                            style={{
                              height: 110,
                              backgroundColor: gameColors[card.game] + '66',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Text style={{ fontSize: 32 }}>{card.emoji}</Text>
                          </View>
                          <View style={{ padding: 5, borderTopColor: colors.ink, borderTopWidth: 2 }}>
                            <PixelText variant="pixel" size={8} numberOfLines={1} style={{ marginBottom: 4 }}>
                              {displayCardName(card.name)}
                            </PixelText>
                            <PixelText variant="pixel" size={9} color={colors.grnDk}>
                              {priceLabel(cardPrice(card, priceMode), inferCardCurrency(card))}
                            </PixelText>
                          </View>
                        </View>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              );
            })}
          </View>
        )}

        {filtered.length === 0 && (
          <View style={{ paddingVertical: 30, alignItems: 'center' }}>
            <PixelText variant="pixel" size={11} color={colors.ink3} style={{ textAlign: 'center', lineHeight: 22 }}>
              카드가 없습니다{`\n`}+ 버튼으로 추가해보세요
            </PixelText>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

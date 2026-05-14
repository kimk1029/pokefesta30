import { View, StyleSheet, Text } from 'react-native';
import { colors, space } from '@/theme/tokens';
import { PixelText } from './PixelText';
import type { FeedItem } from '@/lib/types';

interface Props {
  item: FeedItem;
}

export function FeedRow({ item }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Text style={{ fontSize: 18 }}>{item.user}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.head}>
          <PixelText variant="pixel" size={9} color={colors.ink}>
            🗣 커뮤니티
          </PixelText>
        </View>
        <PixelText
          variant="ko"
          size={12}
          color={colors.ink}
          style={{ marginTop: 6, lineHeight: 18 }}
        >
          {item.text}
        </PixelText>
        <PixelText
          variant="pixel"
          size={8}
          color={colors.ink3}
          style={{ marginTop: 6 }}
        >
          {item.time}
        </PixelText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    padding: 12,
    marginHorizontal: space.gap,
    marginBottom: 8,
    borderWidth: 3,
    borderColor: colors.ink,
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.pap2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
});

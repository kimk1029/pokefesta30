import { View, StyleSheet } from 'react-native';
import { colors, space } from '@/theme/tokens';
import { PixelText } from './PixelText';

interface Props {
  title: string;
  more?: string;
}

export function SectTitle({ title, more }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        <PixelText variant="pixel" size={12} color={colors.yel}>
          {title}
        </PixelText>
        {more ? (
          <PixelText variant="pixel" size={9} color={colors.pap3}>
            {more}
          </PixelText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: space.gap,
    marginBottom: space.cg,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.ink,
    borderWidth: 3,
    borderColor: colors.ink,
  },
});

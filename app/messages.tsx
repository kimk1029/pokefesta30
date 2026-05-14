import { ScrollView, View, StyleSheet, Pressable, Text } from 'react-native';
import { router } from 'expo-router';
import { AppBar } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { colors, space } from '@/theme/tokens';
import { MESSAGE_THREADS } from '@/lib/data';

export default function Messages() {
  return (
    <View style={{ flex: 1 }}>
      <AppBar title="쪽지함" />
      <ScrollView
        contentContainerStyle={{ padding: space.gap, gap: 8, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {MESSAGE_THREADS.map((t) => (
          <Pressable
            key={t.peerId}
            style={styles.row}
            onPress={() => router.push(`/messages/${t.peerId}` as never)}
          >
            <View style={styles.avatar}>
              <Text style={{ fontSize: 22 }}>{t.peerAvatar}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={styles.head}>
                <PixelText variant="pixel" size={11} color={colors.ink}>
                  {t.peerName}
                </PixelText>
                <PixelText variant="pixel" size={8} color={colors.ink3}>
                  {t.lastAt}
                </PixelText>
              </View>
              <PixelText
                variant="pixel"
                size={9}
                color={colors.ink3}
                style={{ marginTop: 6, lineHeight: 14 }}
                numberOfLines={1}
              >
                {t.lastText}
              </PixelText>
            </View>
            {t.unread > 0 ? (
              <View style={styles.unread}>
                <PixelText variant="pixel" size={9} color={colors.white}>
                  {t.unread}
                </PixelText>
              </View>
            ) : null}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 12,
    borderWidth: 3,
    borderColor: colors.ink,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
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
  },
  unread: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    backgroundColor: colors.red,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

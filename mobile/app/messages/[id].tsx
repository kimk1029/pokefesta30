import { useState, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TextInput,
  Pressable,
  Text,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AppBar } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { colors, space } from '@/theme/tokens';
import { useThemeColors, useThemeTextVariant } from '@/components/ThemeProvider';
import { CHAT_THREAD, MESSAGE_THREADS } from '@/lib/data';
import type { ChatMessage } from '@/lib/types';

export default function MessagesThread() {
  const tc = useThemeColors();
  const txt = useThemeTextVariant();
  const { id } = useLocalSearchParams<{ id: string }>();
  const peer = MESSAGE_THREADS.find((t) => t.peerId === id);
  const initial: ChatMessage[] = (id ? CHAT_THREAD[id] : undefined) ?? [];
  const [msgs, setMsgs] = useState<ChatMessage[]>(initial);
  const [input, setInput] = useState('');
  const scRef = useRef<ScrollView>(null);

  useEffect(() => {
    setTimeout(() => scRef.current?.scrollToEnd({ animated: true }), 100);
  }, [msgs.length]);

  const send = () => {
    const t = input.trim();
    if (!t) return;
    const next: ChatMessage = {
      id: msgs.length + 1,
      mine: true,
      text: t,
      time: new Date().toTimeString().slice(0, 5),
    };
    setMsgs((m) => [...m, next]);
    setInput('');
  };

  return (
    <View style={{ flex: 1 }}>
      <AppBar title={peer?.peerName ?? '대화'} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          ref={scRef}
          contentContainerStyle={{ padding: space.gap, gap: 8 }}
        >
          {msgs.map((m) => (
            <View
              key={m.id}
              style={[styles.row, m.mine ? styles.rowMine : styles.rowPeer]}
            >
              {!m.mine && peer ? (
                <View style={styles.avatar}>
                  <Text style={{ fontSize: 16 }}>{peer.peerAvatar}</Text>
                </View>
              ) : null}
              <View
                style={[
                  styles.bubble,
                  m.mine ? styles.bubMine : styles.bubPeer,
                ]}
              >
                <PixelText
                  variant={txt}
                  size={10}
                  color={m.mine ? tc.white : tc.ink}
                  style={{ lineHeight: 16 }}
                >
                  {m.text}
                </PixelText>
              </View>
              <PixelText variant={txt} size={7} color={tc.ink3}>
                {m.time}
              </PixelText>
            </View>
          ))}
        </ScrollView>
        <View style={styles.inputBar}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="메시지 입력"
            placeholderTextColor={tc.ink3}
            style={styles.input}
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <Pressable style={styles.sendBtn} onPress={send}>
            <PixelText variant={txt} size={10} color={tc.white}>
              전송
            </PixelText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  rowMine: { justifyContent: 'flex-end' },
  rowPeer: { justifyContent: 'flex-start' },
  avatar: {
    width: 28,
    height: 28,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.pap2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    maxWidth: '70%',
    padding: 10,
    borderWidth: 2,
    borderColor: colors.ink,
  },
  bubMine: { backgroundColor: colors.red },
  bubPeer: { backgroundColor: colors.white },
  inputBar: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: colors.paper,
    borderTopWidth: 3,
    borderTopColor: colors.ink,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: colors.ink,
    fontSize: 14,
    fontFamily: 'Galmuri11',
    color: colors.ink,
  },
  sendBtn: {
    backgroundColor: colors.ink,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.ink,
  },
});

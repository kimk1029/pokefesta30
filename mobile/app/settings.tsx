/**
 * /settings — 환경설정.
 * 통화·테마·포트폴리오 표시·네비게이션 스타일을 한곳에서 설정. (웹 /my/settings 와 동일)
 */
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { AppBar } from '@/components/AppBar';
import { SectHd } from '@/components/cv/SectHd';
import { PixelFrame } from '@/components/cv/PixelFrame';
import { useThemeColors } from '@/components/ThemeProvider';
import { CurrencySettingsItem } from '@/components/CurrencySettingsItem';
import { ThemeSettingsItem } from '@/components/ThemeSettingsItem';
import { ShowPortfolioSettingsItem } from '@/components/ShowPortfolioSettingsItem';
import { NavStyleSettingsItem } from '@/components/NavStyleSettingsItem';

export default function SettingsScreen() {
  const tc = useThemeColors();
  const divider = <View style={{ height: 1, backgroundColor: tc.pap3, marginHorizontal: 14 }} />;

  return (
    <View style={{ flex: 1, backgroundColor: tc.paper }}>
      <AppBar onBack={() => router.back()} title="설정" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 14, paddingBottom: 110 }}>
        <View style={{ marginHorizontal: 14, marginBottom: 14 }}>
          <SectHd title="환경설정" />
          <PixelFrame>
            <View>
              <CurrencySettingsItem />
              {divider}
              <ThemeSettingsItem />
              {divider}
              <ShowPortfolioSettingsItem />
              {divider}
              <NavStyleSettingsItem />
            </View>
          </PixelFrame>
        </View>
      </ScrollView>
    </View>
  );
}

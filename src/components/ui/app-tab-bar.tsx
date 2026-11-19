import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TabBarProps = Parameters<
  NonNullable<React.ComponentProps<typeof import('expo-router').Tabs>['tabBar']>
>[0];

const ICONS: Record<string, SymbolViewProps['name']> = {
  index: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
  maps: { ios: 'map', android: 'map', web: 'map' },
  history: { ios: 'clock.arrow.circlepath', android: 'history', web: 'history' },
  profile: { ios: 'person.crop.circle', android: 'person', web: 'person' },
};

/**
 * Bottom navigation berupa pill koral melayang.
 * Tab aktif ditandai garis bawah terang dan label tebal; tidak ada pill
 * hitam di dalamnya. Label teks tetap tampil untuk aksesibilitas.
 */
export function AppTabBar({ state, descriptors, navigateToTab, insets }: TabBarProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: theme.background,
          paddingBottom: Math.max(insets.bottom, Spacing.two) + Spacing.one,
        },
      ]}>
      <View style={[styles.pill, Shadow.floating, { backgroundColor: theme.accent }]}>
        {state.routes.map((route, index) => {
          const options = descriptors[route.key]?.options;
          const label =
            typeof options?.title === 'string' && options.title.length > 0
              ? options.title
              : route.name;
          const focused = state.index === index;

          return (
            <Pressable
              key={route.key}
              accessibilityLabel={label}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              onPress={() => navigateToTab(route.key)}
              style={styles.item}>
              <View style={styles.itemInner}>
                <SymbolView
                  name={
                    ICONS[route.name] ?? {
                      ios: 'circle',
                      android: 'circle',
                      web: 'circle',
                    }
                  }
                  size={20}
                  tintColor={theme.onAccent}
                />
                <Text
                  style={[
                    styles.label,
                    {
                      color: theme.onAccent,
                      fontWeight: focused ? '700' : '600',
                    },
                  ]}
                  numberOfLines={1}>
                  {label}
                </Text>
                <View
                  style={[
                    styles.indicator,
                    focused && { backgroundColor: theme.onAccent },
                  ]}
                />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  pill: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.pill,
    padding: Spacing.one,
    minHeight: 64,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  itemInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
    minWidth: 76,
    minHeight: 52,
  },
  label: {
    ...Typography.caption,
    fontSize: 11,
  },
  indicator: {
    width: 18,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'transparent',
    marginTop: 1,
  },
});

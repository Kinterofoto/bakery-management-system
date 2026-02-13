import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { colors } from '../../../theme/colors';

// Simple SF Symbol-style tab icons using text
function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    ordenes: '📋',
  };

  return null; // We use tabBarIcon with system styling
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.separator,
          ...(Platform.OS === 'ios' ? {} : { elevation: 8 }),
        },
        headerStyle: {
          backgroundColor: colors.card,
        },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="ordenes"
        options={{
          title: 'Pedidos',
          headerShown: false,
          tabBarLabel: 'Pedidos',
          tabBarIcon: ({ color, size }) => (
            <TabBarText text="📋" />
          ),
        }}
      />
    </Tabs>
  );
}

// Tiny helper to render emoji as tab icon
import { Text } from 'react-native';
function TabBarText({ text }: { text: string }) {
  return <Text style={{ fontSize: 22 }}>{text}</Text>;
}

import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../theme/colors';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.systemBackground,
          borderTopColor: colors.separator,
          ...(Platform.OS === 'ios'
            ? { position: 'absolute' as const }
            : { elevation: 8 }),
        },
        headerStyle: {
          backgroundColor: colors.systemBackground,
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
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'document-text' : 'document-text-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

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
        tabBarStyle: Platform.select({
          ios: {
            backgroundColor: '#FFFFFF',
            borderTopColor: '#EEEEEE',
            // Native iOS tab bars usually don't need manual height/shadows
            // unless special blur is needed.
          },
          android: {
            backgroundColor: '#FFFFFF',
            borderTopColor: '#EEEEEE',
            height: 64,
            paddingBottom: 10,
            paddingTop: 8,
            elevation: 8,
          },
        }),
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="ordenes"
        options={{
          title: 'Actividad',
          tabBarLabel: 'Actividad',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "receipt" : "receipt-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

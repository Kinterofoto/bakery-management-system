import { Stack } from 'expo-router';
import { colors } from '../../../../theme/colors';

export default function OrdenesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.groupedBackground },
        headerTintColor: colors.text,
        headerBackTitle: 'Atrás',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
    </Stack>
  );
}

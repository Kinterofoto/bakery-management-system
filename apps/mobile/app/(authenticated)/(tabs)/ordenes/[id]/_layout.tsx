import { Stack } from 'expo-router';

export default function OrderDetailLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: 'Atrás',
        headerTintColor: '#000',
      }}
    >
      <Stack.Screen name="index" options={{ headerTitle: '', headerTransparent: true }} />
      <Stack.Screen name="cliente" options={{ title: 'Datos del Cliente' }} />
      <Stack.Screen name="articulos" options={{ title: 'Artículos' }} />
    </Stack>
  );
}

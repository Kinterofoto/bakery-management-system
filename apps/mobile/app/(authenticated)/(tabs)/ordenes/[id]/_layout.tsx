import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function OrderDetailLayout() {
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerBackTitle: 'Atrás',
        headerTintColor: '#000',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerTitle: '',
          headerTransparent: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
              <Ionicons name="chevron-back" size={28} color="#000" />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen name="cliente" options={{ title: 'Datos del Cliente' }} />
      <Stack.Screen name="articulos" options={{ title: 'Artículos' }} />
    </Stack>
  );
}

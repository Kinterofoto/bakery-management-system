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
      <Stack.Screen
        name="index"
        options={{
          title: 'Pedidos',
          headerLargeTitle: true,
          headerLargeStyle: {
            backgroundColor: colors.groupedBackground,
          },
          headerSearchBarOptions: {
            placeholder: 'Buscar pedido, cliente...',
            hideWhenScrolling: false,
          },
        }}
      />
    </Stack>
  );
}

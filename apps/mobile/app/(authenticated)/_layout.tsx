import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '../../stores/auth.store';

export default function AuthenticatedLayout() {
  const session = useAuthStore((s) => s.session);

  if (!session) {
    return <Redirect href="/auth/login" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

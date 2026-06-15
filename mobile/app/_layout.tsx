import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar, View } from 'react-native';

import { useAuthStore } from '../src/store/useAuthStore';
import { Colors } from '../src/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function AuthGuard() {
  const { token, isReady, loadFromStorage } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    loadFromStorage();
  }, []);

  useEffect(() => {
    if (!isReady) return;
    const inAuth = segments[0] === '(auth)';
    const inApp = segments[0] === '(app)';
    const atRoot = segments.length === 0 || segments[0] === 'index';

    if (!token && (inApp || atRoot)) {
      router.replace('/(auth)/login');
    } else if (token && (inAuth || atRoot)) {
      router.replace('/(app)/ventas');
    }
  }, [token, isReady, segments]);

  // Mientras SecureStore carga, muestra canvas vacío (sin flash de login)
  if (!isReady) {
    return <View style={{ flex: 1, backgroundColor: Colors.canvas }} />;
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.canvas} />
      <AuthGuard />
    </QueryClientProvider>
  );
}

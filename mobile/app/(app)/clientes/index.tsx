import { useInfiniteQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ClienteListItem } from '../../../src/components/ClienteListItem';
import { Header } from '../../../src/components/Header';
import { EmpresaSelector } from '../../../src/components/EmpresaSelector';
import { listarClientes } from '../../../src/services/clientes.service';
import { Colors, Spacing, Typography, Radius } from '../../../src/theme';

function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useCallback(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay])();
  return debounced;
}

export default function ClientesScreen() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['clientes', debouncedQuery],
    queryFn: ({ pageParam = 1 }) =>
      listarClientes({ q: debouncedQuery, page: pageParam, page_size: 20 }),
    getNextPageParam: (last: any, pages) =>
      last.next ? pages.length + 1 : undefined,
    initialPageParam: 1,
  });

  const clientes = data?.pages.flatMap((p: any) => p.results) ?? [];

  return (
    <View style={styles.screen}>
      <Header title="Clientes" right={<EmpresaSelector />} />
      <View style={styles.searchRow}>
        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar por nombre o documento"
          placeholderTextColor={Colors.textMuted}
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>
      <FlatList
        data={clientes}
        keyExtractor={(item: any) => String(item.id)}
        renderItem={({ item }) => (
          <ClienteListItem
            cliente={item}
            onPress={() => router.push(`/(app)/clientes/${item.id}`)}
          />
        )}
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {query ? `Sin resultados para "${query}"` : 'Sin clientes'}
              </Text>
              {query ? (
                <Pressable
                  style={styles.cta}
                  onPress={() => router.push({ pathname: '/(app)/clientes/nuevo', params: { nombre: query } })}
                >
                  <Text style={styles.ctaText}>Crear "{query}"</Text>
                </Pressable>
              ) : null}
            </View>
          )
        }
        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={{ margin: Spacing.md }} /> : null}
        contentContainerStyle={clientes.length === 0 ? { flex: 1 } : undefined}
      />
      <Pressable style={styles.fab} onPress={() => router.push('/(app)/clientes/nuevo')}>
        <Text style={styles.fabText}>+ Nuevo</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.canvas },
  searchRow: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  search: {
    ...Typography.body,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    backgroundColor: Colors.canvas,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  emptyText: Typography.secondary,
  cta: { backgroundColor: Colors.ctaBg, borderRadius: 6, paddingHorizontal: Spacing.lg, paddingVertical: 10 },
  ctaText: { ...Typography.body, color: Colors.ctaText, fontWeight: '600' },
  fab: {
    position: 'absolute',
    bottom: Spacing.lg,
    right: Spacing.md,
    backgroundColor: Colors.ctaBg,
    borderRadius: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  fabText: { ...Typography.body, color: Colors.ctaText, fontWeight: '600' },
});

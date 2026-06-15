import { useInfiniteQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { VentaListItem } from '../../../src/components/VentaListItem';
import { Header } from '../../../src/components/Header';
import { EmpresaSelector } from '../../../src/components/EmpresaSelector';
import { listarVentas } from '../../../src/services/ventas.service';
import { Colors, Spacing, Typography } from '../../../src/theme';

const ESTADOS = ['TODAS', 'TERMINADA', 'PENDIENTE', 'CANCELADA'];

export default function VentasScreen() {
  const [estado, setEstado] = useState('TODAS');

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['ventas', estado],
    queryFn: ({ pageParam = 1 }) =>
      listarVentas({ estado: estado === 'TODAS' ? undefined : estado, page: pageParam, page_size: 20 }),
    getNextPageParam: (last: any, pages) => (last.next ? pages.length + 1 : undefined),
    initialPageParam: 1,
  });

  const ventas = data?.pages.flatMap((p: any) => p.results) ?? [];

  return (
    <View style={styles.screen}>
      <Header title="Ventas" right={<EmpresaSelector />} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
        {ESTADOS.map((e) => (
          <Pressable key={e} style={[styles.chip, estado === e && styles.chipActive]} onPress={() => setEstado(e)}>
            <Text style={[styles.chipText, estado === e && styles.chipTextActive]}>{e}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {isLoading
        ? <ActivityIndicator style={{ marginTop: Spacing.xl }} />
        : (
          <FlatList
            data={ventas}
            keyExtractor={(item: any) => String(item.id)}
            renderItem={({ item }) => (
              <VentaListItem venta={item} onPress={() => router.push(`/(app)/ventas/${item.id}`)} />
            )}
            onEndReached={() => hasNextPage && fetchNextPage()}
            onEndReachedThreshold={0.4}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>Sin ventas</Text>
              </View>
            }
            ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={{ margin: Spacing.md }} /> : null}
            contentContainerStyle={ventas.length === 0 ? { flex: 1 } : undefined}
          />
        )}

      <Pressable style={styles.fab} onPress={() => router.push('/(app)/ventas/nueva')}>
        <Text style={styles.fabText}>+ Nueva venta</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.canvas },
  filterBar: { backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border, maxHeight: 48 },
  filterContent: { paddingHorizontal: Spacing.md, gap: Spacing.sm, alignItems: 'center' },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 4, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.ctaBg, borderColor: Colors.ctaBg },
  chipText: Typography.secondary,
  chipTextActive: { color: Colors.ctaText },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: Typography.secondary,
  fab: {
    position: 'absolute', bottom: Spacing.lg, right: Spacing.md,
    backgroundColor: Colors.ctaBg, borderRadius: 6, paddingHorizontal: Spacing.md, paddingVertical: 10,
  },
  fabText: { ...Typography.body, color: Colors.ctaText, fontWeight: '600' },
});

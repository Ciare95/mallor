import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Header } from '../../../src/components/Header';
import { EmpresaSelector } from '../../../src/components/EmpresaSelector';
import { listarProductos, listarCategorias } from '../../../src/services/inventario.service';
import { Colors, Radius, Spacing, Typography } from '../../../src/theme';

function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

type StockStatus = 'normal' | 'low' | 'out';

function getStockStatus(existencias: number, stockMinimo: number): StockStatus {
  const stock = Number(existencias);
  if (stock <= 0) return 'out';
  if (stock <= Number(stockMinimo)) return 'low';
  return 'normal';
}

const STOCK_BADGE: Record<StockStatus, { label: string; bg: string; text: string }> = {
  out: { label: 'Sin stock', bg: Colors.badge.red.bg, text: Colors.badge.red.text },
  low: { label: 'Bajo stock', bg: Colors.badge.yellow.bg, text: Colors.badge.yellow.text },
  normal: { label: '', bg: Colors.badge.green.bg, text: Colors.badge.green.text },
};

function StockBadge({ existencias, stockMinimo }: { existencias: number; stockMinimo: number }) {
  const status = getStockStatus(existencias, stockMinimo);
  const badge = STOCK_BADGE[status];
  if (status === 'normal') return null;
  return (
    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
      <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
    </View>
  );
}

function ProductoItem({ item, onPress }: { item: any; onPress: () => void }) {
  return (
    <Pressable style={styles.item} onPress={onPress}>
      <View style={styles.itemTop}>
        <Text style={styles.itemNombre} numberOfLines={1}>{item.nombre}</Text>
        <StockBadge existencias={item.existencias} stockMinimo={item.stock_minimo} />
      </View>
      <Text style={styles.itemMeta}>
        {item.codigo_interno_formateado ? `#${item.codigo_interno_formateado}` : ''}
        {item.categoria_nombre ? `  ·  ${item.categoria_nombre}` : ''}
      </Text>
      <Text style={styles.itemStock}>
        Stock: <Text style={styles.itemStockVal}>{item.existencias}</Text>
        {'  ·  '}Precio: <Text style={styles.itemStockVal}>
          ${Number(item.precio_venta).toLocaleString('es-CO')}
        </Text>
      </Text>
    </Pressable>
  );
}

export default function InventarioScreen() {
  const params = useLocalSearchParams<{ categoria_id?: string; categoria_nombre?: string }>();
  const [query, setQuery] = useState('');
  const [categoriaId, setCategoriaId] = useState<number | null>(
    params.categoria_id ? Number(params.categoria_id) : null,
  );
  const [categoriaNombre, setCategoriaNombre] = useState(params.categoria_nombre ?? 'Todas');
  const [showCatModal, setShowCatModal] = useState(false);
  const debouncedQuery = useDebounce(query, 400);

  useEffect(() => {
    if (params.categoria_id) {
      setCategoriaId(Number(params.categoria_id));
      setCategoriaNombre(params.categoria_nombre ?? 'Categoría');
    }
  }, [params.categoria_id, params.categoria_nombre]);

  const { data: catData } = useQuery({
    queryKey: ['categorias'],
    queryFn: () => listarCategorias({ page_size: 100 }),
  });
  const categorias: any[] = catData?.results ?? catData ?? [];

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['productos', debouncedQuery, categoriaId],
    queryFn: ({ pageParam = 1 }) =>
      listarProductos({
        q: debouncedQuery || undefined,
        categoria_id: categoriaId ?? undefined,
        page: pageParam,
        page_size: 20,
      }),
    getNextPageParam: (last: any, pages) => (last.next ? pages.length + 1 : undefined),
    initialPageParam: 1,
  });

  const productos = data?.pages.flatMap((p: any) => p.results ?? p) ?? [];

  if (isError && productos.length === 0) {
    return (
      <View style={styles.screen}>
        <Header title="Inventario" right={<EmpresaSelector />} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>Error al cargar el inventario</Text>
          <Pressable style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Header title="Inventario" right={<EmpresaSelector />} />

      <View style={styles.filterRow}>
        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar producto, código..."
          placeholderTextColor={Colors.textMuted}
          autoCorrect={false}
          returnKeyType="search"
        />
        <Pressable style={styles.catBtn} onPress={() => setShowCatModal(true)}>
          <Text style={styles.catBtnText} numberOfLines={1}>{categoriaNombre}</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.textPrimary} />
        </View>
      ) : (
        <FlatList
          data={productos}
          keyExtractor={(item: any) => String(item.id)}
          renderItem={({ item }) => (
            <ProductoItem
              item={item}
              onPress={() => router.push(`/(app)/inventario/${item.id}`)}
            />
          )}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>
                {query ? `Sin resultados para "${query}"` : 'Sin productos'}
              </Text>
            </View>
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator style={{ margin: Spacing.md }} color={Colors.textPrimary} />
            ) : null
          }
          contentContainerStyle={productos.length === 0 ? { flex: 1 } : undefined}
        />
      )}

      <Modal visible={showCatModal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowCatModal(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Filtrar por categoría</Text>
            <Pressable
              style={styles.modalItem}
              onPress={() => {
                setCategoriaId(null);
                setCategoriaNombre('Todas');
                setShowCatModal(false);
              }}
            >
              <Text style={[styles.modalItemText, !categoriaId && styles.modalItemActive]}>
                Todas las categorías
              </Text>
            </Pressable>
            {categorias.map((cat: any) => (
              <Pressable
                key={cat.id}
                style={styles.modalItem}
                onPress={() => {
                  setCategoriaId(cat.id);
                  setCategoriaNombre(cat.nombre);
                  setShowCatModal(false);
                }}
              >
                <Text style={[styles.modalItemText, categoriaId === cat.id && styles.modalItemActive]}>
                  {cat.nombre}
                  {cat.productos_count != null ? ` (${cat.productos_count})` : ''}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.canvas },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  search: {
    flex: 1,
    ...Typography.body,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    backgroundColor: Colors.canvas,
  },
  catBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 10,
    backgroundColor: Colors.canvas,
    maxWidth: 110,
    justifyContent: 'center',
  },
  catBtnText: { ...Typography.secondary, color: Colors.textPrimary },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  errorText: { ...Typography.body, color: Colors.badge.red.text, marginBottom: Spacing.md },
  retryBtn: {
    backgroundColor: Colors.ctaBg,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
  },
  retryText: { ...Typography.body, color: Colors.ctaText, fontWeight: '600' },
  emptyText: Typography.secondary,
  item: {
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 2 },
  itemNombre: { ...Typography.body, fontWeight: '500', flex: 1 },
  itemMeta: { ...Typography.secondary, marginBottom: 2 },
  itemStock: { ...Typography.secondary },
  itemStockVal: { fontWeight: '600', color: Colors.textPrimary },
  badge: {
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 11, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingBottom: Spacing.xl,
    maxHeight: '70%',
  },
  modalTitle: {
    ...Typography.heading,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalItem: {
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalItemText: { ...Typography.body },
  modalItemActive: { fontWeight: '700', color: Colors.textPrimary },
});

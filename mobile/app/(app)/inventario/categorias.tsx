import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Header } from '../../../src/components/Header';
import { listarCategorias } from '../../../src/services/inventario.service';
import { Colors, Radius, Spacing, Typography } from '../../../src/theme';

export default function CategoriasScreen() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['categorias-detalle'],
    queryFn: () => listarCategorias({ page_size: 200 }),
  });

  const categorias: any[] = data?.results ?? data ?? [];

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <Header title="Categorías" showBack />
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.textPrimary} />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.screen}>
        <Header title="Categorías" showBack />
        <View style={styles.centered}>
          <Text style={styles.errorText}>Error al cargar categorías</Text>
          <Pressable style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Header title="Categorías" showBack />
      <FlatList
        data={categorias}
        keyExtractor={(item: any) => String(item.id)}
        renderItem={({ item }) => (
          <Pressable
            style={styles.item}
            onPress={() =>
              router.push({
                pathname: '/(app)/inventario',
                params: { categoria_id: item.id, categoria_nombre: item.nombre },
              })
            }
          >
            <View style={styles.itemContent}>
              <View style={styles.iconWrap}>
                <Ionicons name="folder-outline" size={20} color={Colors.textMuted} />
              </View>
              <View style={styles.itemText}>
                <Text style={styles.itemNombre}>{item.nombre}</Text>
                {item.descripcion ? (
                  <Text style={styles.itemDesc} numberOfLines={1}>{item.descripcion}</Text>
                ) : null}
              </View>
              <View style={styles.countWrap}>
                <Text style={styles.countText}>{item.productos_count ?? 0}</Text>
                <Text style={styles.countLabel}>productos</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No hay categorías registradas</Text>
          </View>
        }
        contentContainerStyle={categorias.length === 0 ? { flex: 1 } : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.canvas },
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
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: { flex: 1 },
  itemNombre: { ...Typography.body, fontWeight: '500' },
  itemDesc: { ...Typography.secondary, marginTop: 2 },
  countWrap: { alignItems: 'center', minWidth: 44 },
  countText: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  countLabel: { ...Typography.label },
});

import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Header } from '../../../src/components/Header';
import { buildImageUrl, obtenerProducto } from '../../../src/services/inventario.service';
import { Colors, Radius, Spacing, Typography } from '../../../src/theme';

type StockStatus = 'normal' | 'low' | 'out';

function getStockStatus(existencias: number, stockMinimo: number): StockStatus {
  const stock = Number(existencias);
  if (stock <= 0) return 'out';
  if (stock <= Number(stockMinimo)) return 'low';
  return 'normal';
}

function StockBanner({ existencias, stockMinimo }: { existencias: number; stockMinimo: number }) {
  const status = getStockStatus(existencias, stockMinimo);
  if (status === 'normal') return null;
  const isOut = status === 'out';
  return (
    <View style={[styles.banner, { backgroundColor: isOut ? Colors.badge.red.bg : Colors.badge.yellow.bg }]}>
      <Ionicons
        name={isOut ? 'alert-circle' : 'warning'}
        size={16}
        color={isOut ? Colors.badge.red.text : Colors.badge.yellow.text}
      />
      <Text style={[styles.bannerText, { color: isOut ? Colors.badge.red.text : Colors.badge.yellow.text }]}>
        {isOut ? 'Sin stock disponible' : 'Stock bajo el mínimo'}
      </Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function formatCOP(value: string | number) {
  return `$${Number(value).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function ProductoDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: producto, isLoading, isError, refetch } = useQuery({
    queryKey: ['producto', id],
    queryFn: () => obtenerProducto(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <Header title="Producto" showBack />
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.textPrimary} />
        </View>
      </View>
    );
  }

  if (isError || !producto) {
    return (
      <View style={styles.screen}>
        <Header title="Producto" showBack />
        <View style={styles.centered}>
          <Text style={styles.errorText}>No se pudo cargar el producto</Text>
          <Pressable style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const imageUri = buildImageUrl(producto.imagen);

  return (
    <View style={styles.screen}>
      <Header title={producto.nombre} showBack />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.imageContainer}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="cube-outline" size={56} color={Colors.textMuted} />
            </View>
          )}
        </View>

        <StockBanner existencias={producto.existencias} stockMinimo={producto.stock_minimo} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stock</Text>
          <View style={styles.stockGrid}>
            <View style={styles.stockCell}>
              <Text style={styles.stockVal}>{Number(producto.existencias).toLocaleString('es-CO')}</Text>
              <Text style={styles.stockLabel}>Existencias</Text>
            </View>
            <View style={styles.stockDivider} />
            <View style={styles.stockCell}>
              <Text style={styles.stockVal}>{Number(producto.stock_minimo).toLocaleString('es-CO')}</Text>
              <Text style={styles.stockLabel}>Stock mínimo</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Precios</Text>
          <View style={styles.stockGrid}>
            <View style={styles.stockCell}>
              <Text style={styles.priceVal}>{formatCOP(producto.precio_compra)}</Text>
              <Text style={styles.stockLabel}>Precio compra</Text>
            </View>
            <View style={styles.stockDivider} />
            <View style={styles.stockCell}>
              <Text style={styles.priceVal}>{formatCOP(producto.precio_venta)}</Text>
              <Text style={styles.stockLabel}>Precio venta</Text>
            </View>
          </View>
          {Number(producto.iva) > 0 && (
            <Text style={styles.ivaNote}>IVA: {producto.iva}%</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información</Text>
          <InfoRow
            label="Código interno"
            value={producto.codigo_interno_formateado || String(producto.codigo_interno ?? '')}
          />
          <InfoRow label="Código de barras" value={producto.codigo_barras} />
          <InfoRow label="Categoría" value={producto.categoria?.nombre} />
          <InfoRow label="Marca" value={producto.marca} />
          <InfoRow label="Descripción" value={producto.descripcion} />
          <InfoRow label="INVIMA" value={producto.invima} />
          {producto.fecha_caducidad && (
            <InfoRow label="Fecha caducidad" value={producto.fecha_caducidad} />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.canvas },
  scroll: { paddingBottom: Spacing.xl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  errorText: { ...Typography.body, color: Colors.badge.red.text, marginBottom: Spacing.md },
  retryBtn: {
    backgroundColor: Colors.ctaBg,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
  },
  retryText: { ...Typography.body, color: Colors.ctaText, fontWeight: '600' },
  imageContainer: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  image: { width: '100%', height: 200 },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center', height: 200 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    padding: Spacing.sm,
    borderRadius: Radius.md,
  },
  bannerText: { ...Typography.secondary, fontWeight: '600' },
  section: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    ...Typography.label,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stockGrid: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  stockCell: { flex: 1, alignItems: 'center' },
  stockDivider: { width: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.sm },
  stockVal: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  priceVal: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  stockLabel: { ...Typography.secondary, marginTop: 2 },
  ivaNote: { ...Typography.secondary, textAlign: 'center', paddingBottom: Spacing.sm },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  infoLabel: { ...Typography.secondary, flex: 1 },
  infoValue: { ...Typography.body, flex: 2, textAlign: 'right', fontWeight: '500' },
});

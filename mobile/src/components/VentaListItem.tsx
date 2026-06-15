import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge } from './Badge';
import { Colors, Radius, Spacing, Typography } from '../theme';
import { getVentaEstadoBadge } from '../utils/ventas';

interface Props {
  venta: {
    id: number;
    numero_venta: string;
    fecha_venta: string;
    cliente?: { nombre_completo: string } | null;
    total: string;
    estado: string;
  };
  onPress: () => void;
}

export function VentaListItem({ venta, onPress }: Props) {
  const tone = getVentaEstadoBadge(venta.estado) as any;
  const cliente = venta.cliente?.nombre_completo ?? 'Consumidor Final';
  const fecha = venta.fecha_venta?.slice(0, 10) ?? '';

  return (
    <Pressable style={styles.card} onPress={onPress} android_ripple={{ color: '#f5f5f5' }}>
      <View style={styles.topRow}>
        <Text style={styles.numero}>{venta.numero_venta}</Text>
        <Text style={styles.total}>${Number(venta.total).toLocaleString('es-CO')}</Text>
      </View>
      <View style={styles.midRow}>
        <Text style={styles.cliente} numberOfLines={1}>{cliente}</Text>
        <Badge label={venta.estado} tone={tone} />
      </View>
      <Text style={styles.fecha}>{fecha}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    marginVertical: 5,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  numero: { ...Typography.body, fontWeight: '700' },
  total: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  midRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cliente: { ...Typography.secondary, flex: 1 },
  fecha: Typography.secondary,
});

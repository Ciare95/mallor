import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge } from './Badge';
import { Colors, Spacing, Typography } from '../theme';
import { getVentaEstadoBadge } from '../utils/ventas';

interface Props {
  venta: { id: number; numero_venta: string; fecha_venta: string; cliente?: { nombre_completo: string } | null; total: string; estado: string };
  onPress: () => void;
}

export function VentaListItem({ venta, onPress }: Props) {
  const tone = getVentaEstadoBadge(venta.estado) as any;
  const cliente = venta.cliente?.nombre_completo ?? 'Consumidor Final';
  const fecha = venta.fecha_venta?.slice(0, 10) ?? '';

  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View style={styles.row}>
        <Text style={styles.numero}>#{venta.numero_venta}</Text>
        <Text style={styles.total}>${Number(venta.total).toLocaleString('es-CO')}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.cliente} numberOfLines={1}>{cliente}</Text>
        <Badge label={venta.estado} tone={tone} />
      </View>
      <Text style={styles.fecha}>{fecha}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 4,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  numero: { ...Typography.body, fontWeight: '600' },
  total: { ...Typography.body, fontWeight: '600' },
  cliente: { ...Typography.secondary, flex: 1, marginRight: Spacing.sm },
  fecha: { ...Typography.secondary },
});

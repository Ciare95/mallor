import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';

import { Badge } from '../../../src/components/Badge';
import { Header } from '../../../src/components/Header';
import { cancelarVenta, obtenerVenta } from '../../../src/services/ventas.service';
import { getVentaEstadoBadge } from '../../../src/utils/ventas';
import { Colors, Radius, Spacing, Typography } from '../../../src/theme';

export default function VentaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [motivo, setMotivo] = useState('');

  const { data: venta, isLoading } = useQuery({
    queryKey: ['venta', id],
    queryFn: () => obtenerVenta(id),
    enabled: !!id,
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelarVenta(id, motivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venta', id] });
      queryClient.invalidateQueries({ queryKey: ['ventas'] });
      setModalOpen(false);
      setMotivo('');
    },
    onError: () => Alert.alert('Error', 'No se pudo cancelar la venta.'),
  });

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <Header title="Venta" showBack />
        <ActivityIndicator style={{ marginTop: Spacing.xl }} />
      </View>
    );
  }

  if (!venta) return null;

  const tone = getVentaEstadoBadge(venta.estado) as any;
  const cliente = venta.cliente?.nombre_completo ?? 'Consumidor Final';

  return (
    <View style={styles.screen}>
      <Header title={`Venta #${venta.numero_venta}`} showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Row label="Cliente" value={cliente} />
          <Row label="Estado">
            <Badge label={venta.estado} tone={tone} />
          </Row>
          <Row label="Método de pago" value={venta.metodo_pago} />
          <Row label="Fecha" value={venta.fecha_venta?.slice(0, 10)} />
          {venta.factura_electronica != null && (
            <Row label="Factura electrónica" value={venta.factura_electronica ? 'Sí' : 'No'} />
          )}
        </View>

        <View style={styles.section}>
          {(venta.detalles ?? []).map((d: any, i: number) => (
            <View key={i} style={[styles.detalle, i < (venta.detalles.length - 1) && styles.detalleBorder]}>
              <Text style={styles.detalleNombre} numberOfLines={2}>
                {d.producto?.nombre ?? d.producto_temporal_nombre ?? 'Producto'}
              </Text>
              <View style={styles.detalleRow}>
                <Text style={Typography.secondary}>x{d.cantidad} · ${Number(d.precio_unitario).toLocaleString('es-CO')}</Text>
                <Text style={Typography.body}>${Number(d.total).toLocaleString('es-CO')}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.totales}>
          {venta.descuento && Number(venta.descuento) > 0 && (
            <Row label="Descuento" value={`-$${Number(venta.descuento).toLocaleString('es-CO')}`} />
          )}
          <Row label="Total" value={`$${Number(venta.total).toLocaleString('es-CO')}`} bold />
        </View>

        {venta.estado !== 'CANCELADA' && (
          <Pressable style={styles.cancelBtn} onPress={() => setModalOpen(true)}>
            <Text style={styles.cancelBtnText}>Cancelar venta</Text>
          </Pressable>
        )}
      </ScrollView>

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Motivo de cancelación</Text>
            <TextInput
              style={styles.motivoInput}
              value={motivo}
              onChangeText={setMotivo}
              placeholder="Describe el motivo"
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setModalOpen(false)}>
                <Text style={Typography.body}>Volver</Text>
              </Pressable>
              <Pressable
                style={[styles.modalConfirm, cancelMutation.isPending && { opacity: 0.6 }]}
                onPress={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending
                  ? <ActivityIndicator color={Colors.ctaText} />
                  : <Text style={{ ...Typography.body, color: Colors.ctaText, fontWeight: '600' }}>Confirmar</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Row({ label, value, bold, children }: { label: string; value?: string; bold?: boolean; children?: React.ReactNode }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      {children ?? (
        <Text style={[rowStyles.value, bold && { fontWeight: '600' }]}>{value}</Text>
      )}
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  label: Typography.secondary,
  value: Typography.body,
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.canvas },
  content: { padding: Spacing.md, gap: Spacing.md },
  section: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  detalle: { paddingVertical: 12, paddingHorizontal: Spacing.md, gap: 4 },
  detalleBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  detalleNombre: { ...Typography.body, fontWeight: '500' },
  detalleRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totales: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  cancelBtn: { borderWidth: 1, borderColor: '#FDEBEC', borderRadius: 6, paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { ...Typography.body, color: '#9F2F2D', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: Spacing.lg, gap: Spacing.md },
  modalTitle: { ...Typography.heading },
  motivoInput: { ...Typography.body, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.md, minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: Spacing.sm },
  modalCancel: { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingVertical: 14, alignItems: 'center' },
  modalConfirm: { flex: 1, backgroundColor: Colors.ctaBg, borderRadius: 6, paddingVertical: 14, alignItems: 'center' },
});

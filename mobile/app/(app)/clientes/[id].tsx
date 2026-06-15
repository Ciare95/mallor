import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Header } from '../../../src/components/Header';
import { obtenerCliente } from '../../../src/services/clientes.service';
import { Colors, Spacing, Typography, Radius } from '../../../src/theme';

export default function ClienteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: cliente, isLoading } = useQuery({
    queryKey: ['cliente', id],
    queryFn: () => obtenerCliente(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <Header title="Cliente" showBack />
        <ActivityIndicator style={{ marginTop: Spacing.xl }} />
      </View>
    );
  }

  if (!cliente) return null;

  return (
    <View style={styles.screen}>
      <Header title={cliente.nombre_completo} showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Row label="Documento" value={`${cliente.tipo_documento} ${cliente.numero_documento}`} />
          {cliente.telefono ? <Row label="Teléfono" value={cliente.telefono} /> : null}
          {cliente.email ? <Row label="Correo" value={cliente.email} /> : null}
          {cliente.direccion ? <Row label="Dirección" value={cliente.direccion} /> : null}
        </View>

        <Pressable
          style={styles.cta}
          onPress={() => router.push({ pathname: '/(app)/ventas/nueva', params: { clienteId: cliente.id, clienteNombre: cliente.nombre_completo } })}
        >
          <Text style={styles.ctaText}>Nueva venta</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.canvas },
  content: { padding: Spacing.md, gap: Spacing.lg },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  rowLabel: { ...Typography.secondary },
  rowValue: { ...Typography.body, flex: 1, textAlign: 'right' },
  cta: {
    backgroundColor: Colors.ctaBg,
    borderRadius: 6,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaText: { ...Typography.body, color: Colors.ctaText, fontWeight: '600' },
});

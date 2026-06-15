import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Pressable,
  ScrollView, StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';

import { CrearClienteModal } from '../../../src/components/CrearClienteModal';
import { Header } from '../../../src/components/Header';
import {
  buscarClientesVenta,
  buscarProductos,
  crearVentaCompleta,
} from '../../../src/services/ventas.service';
import {
  CONSUMIDOR_FINAL,
  calculateVentaTotals,
  createLineItem,
  extractApiError,
} from '../../../src/utils/ventas';
import { Colors, Radius, Spacing, Typography } from '../../../src/theme';

type Paso = 1 | 2 | 3;

function Stepper({ paso }: { paso: Paso }) {
  return (
    <View style={stepStyles.row}>
      {[1, 2, 3].map((n) => (
        <View key={n} style={stepStyles.item}>
          <View style={[stepStyles.dot, paso >= n && stepStyles.dotActive]}>
            <Text style={[stepStyles.dotText, paso >= n && stepStyles.dotTextActive]}>{n}</Text>
          </View>
          {n < 3 && <View style={[stepStyles.line, paso > n && stepStyles.lineActive]} />}
        </View>
      ))}
    </View>
  );
}

const stepStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  item: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  dot: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  dotActive: { backgroundColor: Colors.ctaBg, borderColor: Colors.ctaBg },
  dotText: { ...Typography.secondary, fontWeight: '600' },
  dotTextActive: { color: Colors.ctaText },
  line: { flex: 1, height: 1, backgroundColor: Colors.border, marginHorizontal: 4 },
  lineActive: { backgroundColor: Colors.ctaBg },
});

export default function NuevaVentaScreen() {
  const { clienteId, clienteNombre } = useLocalSearchParams<{ clienteId?: string; clienteNombre?: string }>();
  const queryClient = useQueryClient();

  const [paso, setPaso] = useState<Paso>(1);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any>(
    clienteId ? { id: Number(clienteId), nombre_completo: clienteNombre ?? '', persisted: true, esTemporal: false } : CONSUMIDOR_FINAL
  );
  const [clienteQuery, setClienteQuery] = useState('');
  const [clienteResultados, setClienteResultados] = useState<any[]>([]);
  const [mostrarCrearCliente, setMostrarCrearCliente] = useState(false);

  const [productoQuery, setProductoQuery] = useState('');
  const [productoResultados, setProductoResultados] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);

  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'CREDITO'>('EFECTIVO');
  const [abonoInicial, setAbonoInicial] = useState('');
  const [facturaElectronica, setFacturaElectronica] = useState(false);

  const clienteTimer = useRef<ReturnType<typeof setTimeout>>();
  const productoTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(clienteTimer.current);
    if (!clienteQuery.trim()) { setClienteResultados([]); return; }
    clienteTimer.current = setTimeout(async () => {
      const res = await buscarClientesVenta(clienteQuery);
      setClienteResultados(res);
    }, 300);
    return () => clearTimeout(clienteTimer.current);
  }, [clienteQuery]);

  useEffect(() => {
    clearTimeout(productoTimer.current);
    if (!productoQuery.trim()) { setProductoResultados([]); return; }
    productoTimer.current = setTimeout(async () => {
      const res = await buscarProductos(productoQuery);
      setProductoResultados(res.results ?? []);
    }, 300);
    return () => clearTimeout(productoTimer.current);
  }, [productoQuery]);

  const totals = calculateVentaTotals({ items, metodoPago, abonoInicial: Number(abonoInicial), estado: 'TERMINADA' });

  const mutation = useMutation({
    mutationFn: () =>
      crearVentaCompleta({
        items,
        clienteSeleccionado,
        metodoPago,
        abonoInicial: Number(abonoInicial) || 0,
        metodoAbonoInicial: 'EFECTIVO',
        facturaElectronica,
        estado: 'TERMINADA',
        descuentoGlobal: 0,
      }),
    onSuccess: (venta) => {
      queryClient.invalidateQueries({ queryKey: ['ventas'] });
      router.replace(`/(app)/ventas/${venta.id}`);
    },
    onError: (err: any) =>
      Alert.alert('Error', extractApiError(err, 'No se pudo crear la venta.'), [
        { text: 'Reintentar', onPress: () => mutation.mutate() },
        { text: 'Cancelar', style: 'cancel' },
      ]),
  });

  const addProducto = (p: any) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.producto?.id === p.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], cantidad: updated[idx].cantidad + 1 };
        return updated;
      }
      return [...prev, createLineItem(p)];
    });
    setProductoQuery('');
    setProductoResultados([]);
  };

  const updateCantidad = (lineId: string, val: string) => {
    const n = parseFloat(val) || 0;
    if (n <= 0) {
      setItems((prev) => prev.filter((i) => i.id !== lineId));
    } else {
      setItems((prev) => prev.map((i) => i.id === lineId ? { ...i, cantidad: n } : i));
    }
  };

  return (
    <View style={styles.screen}>
      <Header title="Nueva venta" showBack />
      <Stepper paso={paso} />

      {paso === 1 && (
        <View style={styles.paso}>
          <TextInput
            style={styles.search}
            value={clienteQuery}
            onChangeText={setClienteQuery}
            placeholder="Buscar cliente por nombre o documento"
            placeholderTextColor={Colors.textMuted}
            autoFocus
          />
          <FlatList
            data={clienteResultados}
            keyExtractor={(item: any) => String(item.id ?? item.numero_documento)}
            renderItem={({ item }) => (
              <Pressable style={styles.resultItem} onPress={() => { setClienteSeleccionado(item); setClienteQuery(''); setClienteResultados([]); }}>
                <Text style={Typography.body}>{item.nombre_completo}</Text>
                <Text style={Typography.secondary}>{item.tipo_documento} {item.numero_documento}</Text>
              </Pressable>
            )}
            ListHeaderComponent={
              <Pressable style={[styles.resultItem, clienteSeleccionado?.id === null && styles.resultItemActive]}
                onPress={() => { setClienteSeleccionado(CONSUMIDOR_FINAL); setClienteQuery(''); }}>
                <Text style={Typography.body}>Consumidor Final</Text>
              </Pressable>
            }
            ListFooterComponent={
              clienteQuery.trim() ? (
                <Pressable style={styles.resultItem} onPress={() => setMostrarCrearCliente(true)}>
                  <Text style={{ ...Typography.body, color: Colors.textMuted }}>+ Crear "{clienteQuery}"</Text>
                </Pressable>
              ) : null
            }
          />
          <View style={styles.footer}>
            <Text style={Typography.secondary} numberOfLines={1}>
              {clienteSeleccionado?.nombre_completo ?? 'Sin cliente'}
            </Text>
            <Pressable style={styles.cta} onPress={() => setPaso(2)}>
              <Text style={styles.ctaText}>Continuar</Text>
            </Pressable>
          </View>
        </View>
      )}

      {paso === 2 && (
        <View style={styles.paso}>
          <TextInput
            style={styles.search}
            value={productoQuery}
            onChangeText={setProductoQuery}
            placeholder="Buscar producto por nombre o código"
            placeholderTextColor={Colors.textMuted}
            autoFocus
          />
          {productoResultados.length > 0 && (
            <FlatList
              data={productoResultados}
              keyExtractor={(item: any) => String(item.id)}
              renderItem={({ item }) => (
                <Pressable style={styles.resultItem} onPress={() => addProducto(item)}>
                  <Text style={Typography.body}>{item.nombre}</Text>
                  <Text style={Typography.secondary}>${Number(item.precio_venta).toLocaleString('es-CO')}</Text>
                </Pressable>
              )}
              style={styles.resultList}
            />
          )}

          <FlatList
            data={items}
            keyExtractor={(item: any) => item.id}
            renderItem={({ item }) => (
              <View style={styles.lineItem}>
                <Text style={[Typography.body, { flex: 1 }]} numberOfLines={1}>{item.producto?.nombre}</Text>
                <TextInput
                  style={styles.cantInput}
                  value={String(item.cantidad)}
                  onChangeText={(v) => updateCantidad(item.id, v)}
                  keyboardType="numeric"
                />
                <Text style={Typography.secondary}>${(item.cantidad * item.precio_unitario).toLocaleString('es-CO')}</Text>
              </View>
            )}
            ListEmptyComponent={<Text style={[Typography.secondary, { padding: Spacing.md }]}>Agrega productos</Text>}
          />

          <View style={styles.footer}>
            <Text style={Typography.body}>Subtotal: ${totals.total.toLocaleString('es-CO')}</Text>
            <View style={styles.footerBtns}>
              <Pressable style={styles.ctaSecondary} onPress={() => setPaso(1)}>
                <Text style={Typography.body}>Atrás</Text>
              </Pressable>
              <Pressable
                style={[styles.cta, items.length === 0 && styles.ctaDisabled]}
                onPress={() => { if (items.length === 0) { Alert.alert('', 'Agrega al menos un producto.'); return; } setPaso(3); }}
              >
                <Text style={styles.ctaText}>Continuar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {paso === 3 && (
        <ScrollView contentContainerStyle={styles.paso3}>
          <View style={styles.resumen}>
            <Text style={styles.resumenLabel}>Cliente</Text>
            <Text style={Typography.body}>{clienteSeleccionado?.nombre_completo}</Text>
          </View>

          <View style={styles.resumen}>
            {items.map((item, i) => (
              <View key={item.id} style={[styles.resumenRow, i < items.length - 1 && { borderBottomWidth: 1, borderBottomColor: Colors.border }]}>
                <Text style={[Typography.body, { flex: 1 }]} numberOfLines={1}>{item.producto?.nombre}</Text>
                <Text style={Typography.secondary}>x{item.cantidad}</Text>
              </View>
            ))}
          </View>

          <View style={styles.resumen}>
            <View style={styles.resumenRow}>
              <Text style={Typography.secondary}>Total</Text>
              <Text style={{ ...Typography.body, fontWeight: '600' }}>${totals.total.toLocaleString('es-CO')}</Text>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={Typography.label}>Método de pago</Text>
            <View style={styles.metodosRow}>
              {(['EFECTIVO', 'CREDITO'] as const).map((m) => (
                <Pressable key={m} style={[styles.metodoBtn, metodoPago === m && styles.metodoBtnActive]} onPress={() => setMetodoPago(m)}>
                  <Text style={[Typography.secondary, metodoPago === m && { color: Colors.ctaText }]}>{m}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {metodoPago === 'CREDITO' && (
            <View style={styles.field}>
              <Text style={Typography.label}>Abono inicial (opcional)</Text>
              <TextInput
                style={styles.inputField}
                value={abonoInicial}
                onChangeText={setAbonoInicial}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          )}

          <View style={styles.switchRow}>
            <Text style={Typography.body}>Factura electrónica</Text>
            <Switch
              value={facturaElectronica}
              onValueChange={setFacturaElectronica}
              trackColor={{ true: Colors.ctaBg }}
            />
          </View>

          <View style={styles.footerBtns}>
            <Pressable style={styles.ctaSecondary} onPress={() => setPaso(2)}>
              <Text style={Typography.body}>Atrás</Text>
            </Pressable>
            <Pressable
              style={[styles.cta, mutation.isPending && styles.ctaDisabled]}
              onPress={() => mutation.mutate()}
              disabled={mutation.isPending}
            >
              {mutation.isPending
                ? <ActivityIndicator color={Colors.ctaText} />
                : <Text style={styles.ctaText}>Confirmar venta</Text>}
            </Pressable>
          </View>
        </ScrollView>
      )}

      <CrearClienteModal
        visible={mostrarCrearCliente}
        onClose={() => setMostrarCrearCliente(false)}
        onCreated={(c) => { setClienteSeleccionado(c); setMostrarCrearCliente(false); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.canvas },
  paso: { flex: 1 },
  paso3: { padding: Spacing.md, gap: Spacing.md },
  search: { ...Typography.body, margin: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 10, backgroundColor: Colors.surface },
  resultList: { maxHeight: 200, marginHorizontal: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, marginBottom: Spacing.sm },
  resultItem: { paddingVertical: 12, paddingHorizontal: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  resultItemActive: { backgroundColor: Colors.canvas },
  lineItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 10, paddingHorizontal: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
  cantInput: { ...Typography.body, width: 50, textAlign: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: 4, paddingVertical: 4 },
  footer: { padding: Spacing.md, gap: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface },
  footerBtns: { flexDirection: 'row', gap: Spacing.sm },
  cta: { flex: 1, backgroundColor: Colors.ctaBg, borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center' },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { ...Typography.body, color: Colors.ctaText, fontWeight: '600' },
  ctaSecondary: { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center' },
  resumen: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, gap: Spacing.sm },
  resumenLabel: { ...Typography.label, marginBottom: 2 },
  resumenRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  field: { gap: Spacing.xs },
  inputField: { ...Typography.body, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingVertical: 8 },
  metodosRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: 4 },
  metodoBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4, borderWidth: 1, borderColor: Colors.border },
  metodoBtnActive: { backgroundColor: Colors.ctaBg, borderColor: Colors.ctaBg },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm },
});

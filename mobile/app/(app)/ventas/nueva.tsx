import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, Pressable,
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
const PASO_LABELS = ['Productos', 'Cliente', 'Pago'];

const API_BASE = (process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://mallor.onrender.com/api').replace('/api', '');

function resolveImgUrl(path?: string | null): string | null {
  if (!path) return null;
  return path.startsWith('http') ? path : `${API_BASE}${path}`;
}

// ─── Stepper ─────────────────────────────────────────────────────────────────
function Stepper({ paso }: { paso: Paso }) {
  return (
    <View style={sS.outer}>
      <View style={sS.dotsRow}>
        {([1, 2, 3] as Paso[]).map((n, i) => (
          <View key={n} style={sS.segment}>
            {i > 0 && <View style={[sS.line, paso > i && sS.lineOn]} />}
            <View style={[sS.dot, paso >= n && sS.dotOn]}>
              {paso > n
                ? <Ionicons name="checkmark" size={12} color={Colors.ctaText} />
                : <Text style={[sS.num, paso >= n && sS.numOn]}>{n}</Text>}
            </View>
          </View>
        ))}
      </View>
      <View style={sS.labelsRow}>
        {PASO_LABELS.map((l, i) => (
          <Text key={i} style={[sS.label, paso === i + 1 && sS.labelOn]}>{l}</Text>
        ))}
      </View>
    </View>
  );
}

const sS = StyleSheet.create({
  outer: {
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.lg, paddingTop: 14, paddingBottom: 10,
  },
  dotsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  segment: { flexDirection: 'row', alignItems: 'center' },
  line: { width: 56, height: 2, backgroundColor: Colors.border },
  lineOn: { backgroundColor: Colors.ctaBg },
  dot: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, borderColor: Colors.border, backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  dotOn: { borderColor: Colors.ctaBg, backgroundColor: Colors.ctaBg },
  num: { ...Typography.secondary, fontWeight: '600' },
  numOn: { color: Colors.ctaText },
  labelsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { ...Typography.secondary, fontSize: 10, flex: 1, textAlign: 'center' },
  labelOn: { color: Colors.textPrimary, fontWeight: '600' },
});

// ─── ProductRow ───────────────────────────────────────────────────────────────
function ProductRow({ item, qty, onPress }: { item: any; qty: number; onPress: () => void }) {
  const imgUrl = resolveImgUrl(item.imagen);
  return (
    <Pressable style={pR.row} onPress={onPress} android_ripple={{ color: '#f0f0ee' }}>
      {imgUrl ? (
        <Image source={{ uri: imgUrl }} style={pR.img} resizeMode="cover" />
      ) : (
        <View style={[pR.img, pR.imgPlaceholder]}>
          <Text style={pR.initial}>{(item.nombre ?? 'P')[0].toUpperCase()}</Text>
        </View>
      )}
      <View style={pR.info}>
        <Text style={pR.nombre} numberOfLines={2}>{item.nombre}</Text>
        <Text style={pR.precio}>${Number(item.precio_venta).toLocaleString('es-CO')}</Text>
      </View>
      <View style={pR.addWrap}>
        {qty > 0 && (
          <View style={pR.badge}>
            <Text style={pR.badgeText}>{qty}</Text>
          </View>
        )}
        <View style={pR.addBtn}>
          <Text style={pR.addIcon}>+</Text>
        </View>
      </View>
    </Pressable>
  );
}

const pR = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  img: { width: 52, height: 52, borderRadius: 8, marginRight: 12 },
  imgPlaceholder: { backgroundColor: '#E8E6E3', alignItems: 'center', justifyContent: 'center' },
  initial: { fontSize: 18, fontWeight: '700', color: Colors.textMuted },
  info: { flex: 1, gap: 3 },
  nombre: { ...Typography.body, fontWeight: '500', lineHeight: 20 },
  precio: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  addWrap: { alignItems: 'center', gap: 4, marginLeft: 8 },
  badge: {
    backgroundColor: Colors.ctaBg, borderRadius: 10,
    minWidth: 20, height: 20, paddingHorizontal: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: Colors.ctaText, fontSize: 11, fontWeight: '700' },
  addBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.ctaBg, alignItems: 'center', justifyContent: 'center',
  },
  addIcon: { color: Colors.ctaText, fontSize: 22, fontWeight: '300', lineHeight: 24 },
});

// ─── CartRow ──────────────────────────────────────────────────────────────────
function CartRow({ item, onUpdate }: { item: any; onUpdate: (id: string, v: string) => void }) {
  return (
    <View style={cR.row}>
      <View style={cR.qtyCtrl}>
        <Pressable style={cR.qtyBtn} onPress={() => onUpdate(item.id, String(item.cantidad - 1))}>
          <Text style={cR.op}>−</Text>
        </Pressable>
        <Text style={cR.qty}>{item.cantidad}</Text>
        <Pressable style={cR.qtyBtn} onPress={() => onUpdate(item.id, String(item.cantidad + 1))}>
          <Text style={cR.op}>+</Text>
        </Pressable>
      </View>
      <Text style={cR.nombre} numberOfLines={1}>{item.producto?.nombre}</Text>
      <Text style={cR.total}>${(item.cantidad * item.precio_unitario).toLocaleString('es-CO')}</Text>
    </View>
  );
}

const cR = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  qtyCtrl: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border, borderRadius: 6, overflow: 'hidden',
  },
  qtyBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  op: { fontSize: 16, fontWeight: '500', color: Colors.textPrimary },
  qty: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, minWidth: 22, textAlign: 'center' },
  nombre: { ...Typography.secondary, flex: 1 },
  total: { ...Typography.body, fontWeight: '600' },
});

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function NuevaVentaScreen() {
  const { clienteId, clienteNombre } = useLocalSearchParams<{ clienteId?: string; clienteNombre?: string }>();
  const queryClient = useQueryClient();

  const [paso, setPaso] = useState<Paso>(1);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any>(
    clienteId
      ? { id: Number(clienteId), nombre_completo: clienteNombre ?? '', persisted: true, esTemporal: false }
      : CONSUMIDOR_FINAL,
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

  const productoTimer = useRef<ReturnType<typeof setTimeout>>();
  const clienteTimer = useRef<ReturnType<typeof setTimeout>>();

  const { data: browseProducts, isLoading: loadingBrowse } = useQuery({
    queryKey: ['productos-browse'],
    queryFn: () => buscarProductos(''),
    staleTime: 5 * 60 * 1000,
    select: (d: any) => d.results ?? [],
  });

  useEffect(() => {
    clearTimeout(productoTimer.current);
    if (!productoQuery.trim()) { setProductoResultados([]); return; }
    productoTimer.current = setTimeout(async () => {
      const res = await buscarProductos(productoQuery);
      setProductoResultados(res.results ?? []);
    }, 300);
    return () => clearTimeout(productoTimer.current);
  }, [productoQuery]);

  useEffect(() => {
    clearTimeout(clienteTimer.current);
    if (!clienteQuery.trim()) { setClienteResultados([]); return; }
    clienteTimer.current = setTimeout(async () => {
      const res = await buscarClientesVenta(clienteQuery);
      setClienteResultados(res);
    }, 300);
    return () => clearTimeout(clienteTimer.current);
  }, [clienteQuery]);

  const displayProductos: any[] = productoQuery.trim() ? productoResultados : (browseProducts ?? []);
  const totals = calculateVentaTotals({ items, metodoPago, abonoInicial: Number(abonoInicial), estado: 'TERMINADA' });

  const getQty = (productId: number) => items.find((i) => i.producto?.id === productId)?.cantidad ?? 0;

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
  };

  const updateCantidad = (lineId: string, val: string) => {
    const n = parseFloat(val) || 0;
    setItems((prev) =>
      n <= 0 ? prev.filter((i) => i.id !== lineId) : prev.map((i) => i.id === lineId ? { ...i, cantidad: n } : i),
    );
  };

  const mutation = useMutation({
    mutationFn: () =>
      crearVentaCompleta({
        items, clienteSeleccionado, metodoPago,
        abonoInicial: Number(abonoInicial) || 0,
        metodoAbonoInicial: 'EFECTIVO',
        facturaElectronica, estado: 'TERMINADA', descuentoGlobal: 0,
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

  return (
    <View style={ss.screen}>
      <Header title="Nueva venta" showBack />
      <Stepper paso={paso} />

      {/* ── PASO 1: PRODUCTOS ─────────────────────────────── */}
      {paso === 1 && (
        <View style={ss.flex}>
          <TextInput
            style={ss.search}
            value={productoQuery}
            onChangeText={setProductoQuery}
            placeholder="Buscar producto por nombre o código..."
            placeholderTextColor={Colors.textMuted}
          />

          {loadingBrowse && !productoQuery ? (
            <ActivityIndicator style={{ marginTop: Spacing.xl }} />
          ) : (
            <FlatList
              data={displayProductos}
              keyExtractor={(p: any) => String(p.id)}
              style={ss.flex}
              renderItem={({ item }) => (
                <ProductRow item={item} qty={getQty(item.id)} onPress={() => addProducto(item)} />
              )}
              ListEmptyComponent={
                productoQuery ? (
                  <Text style={ss.empty}>Sin resultados para "{productoQuery}"</Text>
                ) : null
              }
            />
          )}

          {items.length > 0 && (
            <View style={ss.cartSection}>
              <Text style={ss.cartTitle}>
                Carrito · {items.length} ítem{items.length !== 1 ? 's' : ''}
              </Text>
              <ScrollView style={{ maxHeight: 170 }}>
                {items.map((item) => (
                  <CartRow key={item.id} item={item} onUpdate={updateCantidad} />
                ))}
              </ScrollView>
            </View>
          )}

          <View style={ss.footer}>
            <View>
              <Text style={ss.footerLabel}>Total</Text>
              <Text style={ss.footerTotal}>${totals.total.toLocaleString('es-CO')}</Text>
            </View>
            <Pressable
              style={[ss.cta, items.length === 0 && ss.ctaDisabled]}
              onPress={() => {
                if (items.length === 0) { Alert.alert('', 'Agrega al menos un producto.'); return; }
                setPaso(2);
              }}
            >
              <Text style={ss.ctaText}>Siguiente</Text>
              <Ionicons name="arrow-forward" size={16} color={Colors.ctaText} />
            </Pressable>
          </View>
        </View>
      )}

      {/* ── PASO 2: CLIENTE ──────────────────────────────── */}
      {paso === 2 && (
        <View style={ss.flex}>
          <TextInput
            style={ss.search}
            value={clienteQuery}
            onChangeText={setClienteQuery}
            placeholder="Buscar cliente por nombre o documento..."
            placeholderTextColor={Colors.textMuted}
            autoFocus
          />
          <FlatList
            data={clienteResultados}
            keyExtractor={(item: any) => String(item.id ?? item.numero_documento)}
            style={ss.flex}
            renderItem={({ item }) => (
              <Pressable
                style={[ss.clienteRow, clienteSeleccionado?.id === item.id && ss.clienteRowActive]}
                onPress={() => { setClienteSeleccionado(item); setClienteQuery(''); setClienteResultados([]); }}
              >
                <Text style={ss.clienteNombre}>{item.nombre_completo}</Text>
                <Text style={ss.clienteDoc}>{item.tipo_documento} {item.numero_documento}</Text>
              </Pressable>
            )}
            ListHeaderComponent={
              <Pressable
                style={[ss.clienteRow, clienteSeleccionado?.id === null && ss.clienteRowActive]}
                onPress={() => { setClienteSeleccionado(CONSUMIDOR_FINAL); setClienteQuery(''); }}
              >
                <Text style={ss.clienteNombre}>Consumidor Final</Text>
                <Text style={ss.clienteDoc}>Sin documento</Text>
              </Pressable>
            }
            ListFooterComponent={
              clienteQuery.trim() ? (
                <Pressable style={ss.clienteRow} onPress={() => setMostrarCrearCliente(true)}>
                  <Text style={[ss.clienteNombre, { color: Colors.textMuted }]}>
                    + Crear "{clienteQuery}"
                  </Text>
                </Pressable>
              ) : null
            }
          />

          <View style={[ss.footer, ss.footerColumn]}>
            <View style={ss.clienteSelected}>
              <Text style={ss.footerLabel}>Cliente seleccionado</Text>
              <Text style={ss.footerClienteValue} numberOfLines={1}>
                {clienteSeleccionado?.nombre_completo ?? 'Sin cliente'}
              </Text>
            </View>
            <View style={ss.footerBtns}>
              <Pressable style={ss.ctaSecondary} onPress={() => setPaso(1)}>
                <Ionicons name="arrow-back" size={18} color={Colors.textPrimary} />
              </Pressable>
              <Pressable style={[ss.cta, ss.ctaFlex]} onPress={() => setPaso(3)}>
                <Text style={ss.ctaText}>Continuar</Text>
                <Ionicons name="arrow-forward" size={16} color={Colors.ctaText} />
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* ── PASO 3: PAGO ─────────────────────────────────── */}
      {paso === 3 && (
        <ScrollView contentContainerStyle={ss.paso3}>
          <View style={ss.card}>
            <View style={ss.cardRow}>
              <Text style={ss.cardLabel}>Cliente</Text>
              <Text style={ss.cardValue} numberOfLines={1}>{clienteSeleccionado?.nombre_completo}</Text>
            </View>
            <View style={[ss.cardRow, { borderBottomWidth: 0 }]}>
              <Text style={ss.cardLabel}>Ítems</Text>
              <Text style={ss.cardValue}>{items.length} producto{items.length !== 1 ? 's' : ''}</Text>
            </View>
          </View>

          <View style={ss.card}>
            {items.map((item, i) => (
              <View key={item.id} style={[ss.cardRow, i === items.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={[ss.cardLabel, { flex: 1 }]} numberOfLines={1}>{item.producto?.nombre}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={ss.cardLabel}>x{item.cantidad}</Text>
                  <Text style={ss.cardValue}>${(item.cantidad * item.precio_unitario).toLocaleString('es-CO')}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={[ss.card, ss.totalCard]}>
            <Text style={ss.totalCardLabel}>Total a pagar</Text>
            <Text style={ss.totalCardValue}>${totals.total.toLocaleString('es-CO')}</Text>
          </View>

          <View style={ss.field}>
            <Text style={ss.fieldLabel}>Método de pago</Text>
            <View style={ss.payRow}>
              {(['EFECTIVO', 'CREDITO'] as const).map((m) => (
                <Pressable key={m} style={[ss.payBtn, metodoPago === m && ss.payBtnActive]} onPress={() => setMetodoPago(m)}>
                  <Text style={[ss.payBtnText, metodoPago === m && ss.payBtnTextActive]}>{m}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {metodoPago === 'CREDITO' && (
            <View style={ss.field}>
              <Text style={ss.fieldLabel}>Abono inicial (opcional)</Text>
              <TextInput
                style={ss.input}
                value={abonoInicial}
                onChangeText={setAbonoInicial}
                keyboardType="numeric"
                placeholder="$0"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          )}

          <View style={ss.switchRow}>
            <Text style={ss.switchLabel}>Factura electrónica</Text>
            <Switch value={facturaElectronica} onValueChange={setFacturaElectronica} trackColor={{ true: Colors.ctaBg }} />
          </View>

          <View style={ss.footerBtns}>
            <Pressable style={ss.ctaSecondary} onPress={() => setPaso(2)}>
              <Ionicons name="arrow-back" size={18} color={Colors.textPrimary} />
              <Text style={ss.ctaSecondaryText}>Atrás</Text>
            </Pressable>
            <Pressable
              style={[ss.cta, ss.ctaFlex, mutation.isPending && ss.ctaDisabled]}
              onPress={() => mutation.mutate()}
              disabled={mutation.isPending}
            >
              {mutation.isPending
                ? <ActivityIndicator color={Colors.ctaText} />
                : <Text style={ss.ctaText}>Confirmar venta</Text>}
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

const ss = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.canvas },
  flex: { flex: 1 },

  search: {
    ...Typography.body,
    margin: Spacing.md, marginBottom: 0,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
  },
  empty: { ...Typography.secondary, textAlign: 'center', marginTop: Spacing.xl, paddingHorizontal: Spacing.lg },

  cartSection: {
    borderTopWidth: 2, borderTopColor: Colors.canvas,
    backgroundColor: Colors.canvas,
  },
  cartTitle: {
    ...Typography.label,
    textTransform: 'uppercase', letterSpacing: 0.6,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
  },

  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.md, paddingBottom: 20,
    backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
    gap: Spacing.md,
  },
  footerColumn: { flexDirection: 'column', gap: Spacing.sm, alignItems: 'stretch' },
  footerLabel: Typography.secondary,
  footerTotal: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  footerBtns: { flexDirection: 'row', gap: Spacing.sm },
  clienteSelected: { gap: 2 },
  footerClienteValue: { ...Typography.body, fontWeight: '600' },

  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.ctaBg, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 14,
  },
  ctaFlex: { flex: 1 },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { ...Typography.body, color: Colors.ctaText, fontWeight: '600' },
  ctaSecondary: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 14,
  },
  ctaSecondaryText: Typography.body,

  clienteRow: {
    paddingHorizontal: Spacing.md, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  clienteRowActive: { backgroundColor: '#F0EFED' },
  clienteNombre: { ...Typography.body, fontWeight: '500' },
  clienteDoc: { ...Typography.secondary, marginTop: 2 },

  paso3: { padding: Spacing.md, gap: Spacing.md, paddingBottom: 40 },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  cardRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  cardLabel: Typography.secondary,
  cardValue: { ...Typography.body, fontWeight: '500', textAlign: 'right' },

  totalCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 16,
  },
  totalCardLabel: { ...Typography.body, fontWeight: '500' },
  totalCardValue: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary },

  field: { gap: 8 },
  fieldLabel: Typography.label,
  payRow: { flexDirection: 'row', gap: Spacing.sm },
  payBtn: {
    flex: 1, paddingVertical: 13, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  payBtnActive: { backgroundColor: Colors.ctaBg, borderColor: Colors.ctaBg },
  payBtnText: { ...Typography.body, fontWeight: '500' },
  payBtnTextActive: { color: Colors.ctaText },
  input: {
    ...Typography.body,
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    backgroundColor: Colors.surface,
  },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
  },
  switchLabel: Typography.body,
});

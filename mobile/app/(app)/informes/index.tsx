import DateTimePicker from '@react-native-community/datetimepicker';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';

import { Header } from '../../../src/components/Header';
import { EmpresaSelector } from '../../../src/components/EmpresaSelector';
import { obtenerDashboardEstadisticas } from '../../../src/services/informes.service';
import { Colors, Radius, Spacing, Typography } from '../../../src/theme';

const PERIODOS = [
  { label: 'Hoy', value: 'hoy' },
  { label: 'Semana', value: 'semana' },
  { label: 'Mes', value: 'mes' },
] as const;

type Periodo = typeof PERIODOS[number]['value'] | 'personalizado';

function getFiltros(periodo: Periodo, fechaInicio: string, fechaFin: string) {
  const hoy = new Date().toISOString().slice(0, 10);
  if (periodo === 'hoy') return { fecha_inicio: hoy, fecha_fin: hoy };
  if (periodo === 'semana') {
    const d = new Date(); d.setDate(d.getDate() - 6);
    return { fecha_inicio: d.toISOString().slice(0, 10), fecha_fin: hoy };
  }
  if (periodo === 'mes') {
    const d = new Date(); d.setDate(1);
    return { fecha_inicio: d.toISOString().slice(0, 10), fecha_fin: hoy };
  }
  return { fecha_inicio: fechaInicio, fecha_fin: fechaFin };
}

function SkeletonRow() {
  return <View style={skeletonStyles.row} />;
}
const skeletonStyles = StyleSheet.create({
  row: { height: 48, backgroundColor: Colors.border, borderRadius: 6, marginVertical: 4 },
});

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={metricStyles.card}>
      <Text style={metricStyles.value}>{value}</Text>
      <Text style={metricStyles.label}>{label}</Text>
    </View>
  );
}
const metricStyles = StyleSheet.create({
  card: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, gap: 2, minWidth: '45%' },
  value: { ...Typography.title, fontSize: 22 },
  label: Typography.secondary,
});

export default function InformesScreen() {
  const [periodo, setPeriodo] = useState<Periodo>('hoy');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [pickerTarget, setPickerTarget] = useState<'inicio' | 'fin' | null>(null);
  const [pickerDate, setPickerDate] = useState(new Date());

  const filtros = getFiltros(periodo, fechaInicio, fechaFin);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard', filtros],
    queryFn: () => obtenerDashboardEstadisticas(filtros),
  });

  const resumen = data?.ventas?.resumen;
  const totalVentas = resumen?.total_ventas ?? 0;
  const numTransacciones = resumen?.cantidad_ventas ?? 0;
  const ticketPromedio = resumen?.ticket_promedio ?? 0;
  const topProductos: any[] = data?.productos_destacados ?? [];

  return (
    <View style={styles.screen}>
      <Header title="Informes" right={<EmpresaSelector />} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
        {PERIODOS.map((p) => (
          <Pressable key={p.value} style={[styles.chip, periodo === p.value && styles.chipActive]} onPress={() => setPeriodo(p.value)}>
            <Text style={[styles.chipText, periodo === p.value && styles.chipTextActive]}>{p.label}</Text>
          </Pressable>
        ))}
        <Pressable style={[styles.chip, periodo === 'personalizado' && styles.chipActive]} onPress={() => { setPeriodo('personalizado'); setPickerTarget('inicio'); }}>
          <Text style={[styles.chipText, periodo === 'personalizado' && styles.chipTextActive]}>
            {periodo === 'personalizado' && fechaInicio ? `${fechaInicio} – ${fechaFin || '...'}` : 'Personalizado'}
          </Text>
        </Pressable>
      </ScrollView>

      {pickerTarget && (
        Platform.OS === 'android' ? (
          <DateTimePicker
            value={pickerDate}
            mode="date"
            display="default"
            onChange={(_, date) => {
              if (!date) { setPickerTarget(null); return; }
              const iso = date.toISOString().slice(0, 10);
              if (pickerTarget === 'inicio') { setFechaInicio(iso); setPickerDate(date); setPickerTarget('fin'); }
              else { setFechaFin(iso); setPickerTarget(null); }
            }}
          />
        ) : (
          <Modal transparent animationType="slide" onRequestClose={() => setPickerTarget(null)}>
            <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} onPress={() => setPickerTarget(null)} />
            <View style={{ backgroundColor: Colors.surface, padding: Spacing.md }}>
              <DateTimePicker
                value={pickerDate}
                mode="date"
                display="spinner"
                onChange={(_, date) => date && setPickerDate(date)}
              />
              <Pressable style={styles.retryBtn} onPress={() => {
                const iso = pickerDate.toISOString().slice(0, 10);
                if (pickerTarget === 'inicio') { setFechaInicio(iso); setPickerTarget('fin'); }
                else { setFechaFin(iso); setPickerTarget(null); }
              }}>
                <Text style={styles.retryText}>Aceptar</Text>
              </Pressable>
            </View>
          </Modal>
        )
      )}

      <ScrollView contentContainerStyle={styles.content}>
        {isLoading && (
          <>
            <View style={styles.metricsGrid}>
              {[1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}
            </View>
          </>
        )}

        {isError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>Error al cargar los datos.</Text>
            <Pressable style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryText}>Reintentar</Text>
            </Pressable>
          </View>
        )}

        {!isLoading && !isError && data && (
          <>
            <View style={styles.metricsGrid}>
              <MetricCard
                label="Total ventas"
                value={`$${Number(totalVentas).toLocaleString('es-CO')}`}
              />
              <MetricCard
                label="Transacciones"
                value={String(numTransacciones)}
              />
              <MetricCard
                label="Ticket promedio"
                value={`$${Math.round(ticketPromedio).toLocaleString('es-CO')}`}
              />
            </View>

            {topProductos.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Top 5 productos</Text>
                {topProductos.slice(0, 5).map((p: any, i: number) => (
                  <View key={i} style={[styles.topItem, i < Math.min(topProductos.length, 5) - 1 && styles.topItemBorder]}>
                    <Text style={[Typography.body, { flex: 1 }]} numberOfLines={1}>
                      {p.nombre ?? p.producto__nombre ?? `Producto ${i + 1}`}
                    </Text>
                    <Text style={Typography.secondary}>{p.cantidad_vendida ?? p.total_vendido ?? 0} uds.</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
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
  content: { padding: Spacing.md, gap: Spacing.md },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  section: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', padding: Spacing.md, gap: Spacing.sm },
  sectionTitle: { ...Typography.label, marginBottom: 4 },
  topItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  topItemBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  errorBox: { alignItems: 'center', gap: Spacing.md, paddingTop: Spacing.xl },
  errorText: Typography.secondary,
  retryBtn: { backgroundColor: Colors.ctaBg, borderRadius: 6, paddingHorizontal: Spacing.lg, paddingVertical: 10 },
  retryText: { ...Typography.body, color: Colors.ctaText, fontWeight: '600' },
});

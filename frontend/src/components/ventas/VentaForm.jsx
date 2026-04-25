import { useDeferredValue, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BadgePercent,
  Barcode,
  CreditCard,
  Loader2,
  Plus,
  ScanLine,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { buscarProductos } from '../../services/inventario.service';
import {
  buscarClientesVenta,
  crearClienteTemporal,
} from '../../services/ventas.service';
import { calculateVentaTotals, CONSUMIDOR_FINAL } from '../../utils/ventas';
import { formatCurrency } from '../../utils/formatters';
import { EmptyState, SectionShell, StatusBadge } from './shared';

export default function VentaForm({
  draft,
  localClients,
  isLoading,
  error,
  onChangeField,
  onAddProduct,
  onUpdateItem,
  onRemoveItem,
  onSelectClient,
  onCreateQuickClient,
  onReset,
  onSubmit,
}) {
  const [productQuery, setProductQuery] = useState('');
  const [clientQuery, setClientQuery] = useState('');
  const [showClientModal, setShowClientModal] = useState(false);
  const deferredProductQuery = useDeferredValue(productQuery.trim());
  const deferredClientQuery = useDeferredValue(clientQuery.trim());
  const resumen = useMemo(() => calculateVentaTotals(draft), [draft]);

  const productosQuery = useQuery({
    queryKey: ['ventas', 'pos', 'productos', deferredProductQuery],
    queryFn: () => buscarProductos(deferredProductQuery),
    enabled: deferredProductQuery.length >= 2,
  });

  const clientesQuery = useQuery({
    queryKey: [
      'ventas',
      'pos',
      'clientes',
      deferredClientQuery,
      localClients.length,
    ],
    queryFn: () => buscarClientesVenta(deferredClientQuery, localClients),
  });

  const selectedClient = draft.clienteSeleccionado || CONSUMIDOR_FINAL;
  const canSubmit =
    draft.items.length > 0 &&
    (
      draft.metodoPago !== 'EFECTIVO' ||
      draft.estado !== 'TERMINADA' ||
      resumen.efectivoRecibido >= resumen.total
    );

  const submitLabel =
    draft.estado === 'PENDIENTE' ? 'Guardar como pendiente' : 'Registrar venta';

  const addProductAndClear = (producto) => {
    onAddProduct(producto);
    setProductQuery('');
  };

  const submitWithState = (estado) => {
    onSubmit({
      ...draft,
      estado,
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.45fr_0.92fr]">
      <SectionShell
        eyebrow={draft.ventaId ? 'Edicion' : 'Punto de venta'}
        title={draft.ventaId ? `Editar ${draft.ventaId}` : 'Venta en caja'}
        description="Selecciona cliente, agrega productos por busqueda o codigo y cierra la operacion con el metodo de pago adecuado."
      >
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                    Cliente
                  </div>
                  <div className="mt-2 font-display text-xl text-white">
                    {selectedClient.nombre_completo}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowClientModal(true)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                >
                  <UserPlus className="h-4 w-4" />
                  Cliente rapido
                </button>
              </div>

              <div className="mt-4 grid gap-3">
                <label className="space-y-2">
                  <span className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                    Buscar cliente
                  </span>
                  <input
                    type="text"
                    value={clientQuery}
                    onChange={(event) => setClientQuery(event.target.value)}
                    placeholder="Nombre, documento o telefono"
                    className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none transition focus:border-emerald-400/50"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  {(clientesQuery.data || []).slice(0, 6).map((cliente) => (
                    <button
                      key={cliente.id ?? cliente.numero_documento}
                      type="button"
                      onClick={() => onSelectClient(cliente)}
                      className={`rounded-full border px-3 py-2 text-sm transition ${
                        selectedClient.numero_documento ===
                        cliente.numero_documento
                          ? 'border-emerald-400/40 bg-emerald-400/12 text-emerald-100'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {cliente.nombre_completo}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
              <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                Estado de salida
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {['TERMINADA', 'PENDIENTE'].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onChangeField('estado', option)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      draft.estado === option
                        ? 'border-emerald-400/40 bg-emerald-400/12 text-emerald-100'
                        : 'border-white/10 bg-white/5 text-slate-300'
                    }`}
                  >
                    {option === 'TERMINADA' ? 'Terminada' : 'Pendiente'}
                  </button>
                ))}
              </div>

              <div className="mt-5 space-y-3">
                <ToggleRow
                  label="Factura electronica"
                  checked={draft.facturaElectronica}
                  onChange={(checked) =>
                    onChangeField('facturaElectronica', checked)
                  }
                />
                <ToggleRow
                  label="Imprimir ticket"
                  checked={draft.imprimirTicket}
                  onChange={(checked) => onChangeField('imprimirTicket', checked)}
                />
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
            <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
              <label className="space-y-2">
                <span className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  Buscar producto
                </span>
                <div className="relative">
                  <ScanLine className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={productQuery}
                    onChange={(event) => setProductQuery(event.target.value)}
                    placeholder="Nombre, codigo interno o codigo de barras"
                    className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-11 text-white outline-none transition focus:border-emerald-400/50"
                  />
                </div>
              </label>
              <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  Scanner rapido
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm text-slate-300">
                  <Barcode className="h-4 w-4 text-emerald-200" />
                  Usa el mismo campo de busqueda y presiona agregar.
                </div>
              </div>
            </div>

            <div className="mt-4">
              {productosQuery.isFetching && (
                <div className="mb-3 inline-flex items-center gap-2 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Buscando productos...
                </div>
              )}

              {deferredProductQuery.length >= 2 &&
                !productosQuery.isFetching &&
                (productosQuery.data || []).length > 0 && (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {productosQuery.data.slice(0, 6).map((producto) => (
                      <button
                        key={producto.id}
                        type="button"
                        onClick={() => addProductAndClear(producto)}
                        className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-emerald-400/30 hover:bg-white/[0.07]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-white">
                              {producto.nombre}
                            </div>
                            <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                              {producto.codigo_interno || producto.codigo_barras}
                            </div>
                          </div>
                          <Plus className="h-4 w-4 text-emerald-200" />
                        </div>
                        <div className="mt-3 flex items-center justify-between text-sm text-slate-400">
                          <span>IVA {producto.iva}%</span>
                          <span className="font-display text-base text-white">
                            {formatCurrency(producto.precio_venta)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  Productos agregados
                </div>
                <div className="mt-2 font-display text-xl text-white">
                  {draft.items.length} lineas activas
                </div>
              </div>
              <StatusBadge status={draft.estado} />
            </div>

            {draft.items.length === 0 ? (
              <div className="mt-5">
                <EmptyState
                  title="La venta esta vacia"
                  description="Busca productos por nombre, codigo interno o codigo de barras para construir la venta."
                />
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {resumen.lines.map((item) => (
                  <div
                    key={item.id}
                    className="grid gap-3 rounded-[22px] border border-white/10 bg-white/[0.04] p-4 xl:grid-cols-[1.25fr_0.45fr_0.55fr_0.55fr_0.7fr_auto]"
                  >
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {item.producto.nombre}
                      </div>
                      <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                        IVA {item.producto.iva}% · {item.producto.codigo_interno}
                      </div>
                    </div>
                    <MiniField
                      label="Cantidad"
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.cantidad}
                      onChange={(value) =>
                        onUpdateItem(item.id, { cantidad: value })
                      }
                    />
                    <MiniField
                      label="Precio"
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.precio_unitario}
                      onChange={(value) =>
                        onUpdateItem(item.id, { precio_unitario: value })
                      }
                    />
                    <MiniField
                      label="Desc."
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.descuento}
                      onChange={(value) =>
                        onUpdateItem(item.id, { descuento: value })
                      }
                    />
                    <div className="space-y-1">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                        Total linea
                      </div>
                      <div className="font-display text-xl text-white">
                        {formatCurrency(item.total)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatCurrency(item.subtotal)} + {formatCurrency(item.impuestos)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.id)}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-100"
                    >
                      <Trash2 className="h-4 w-4" />
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SectionShell>

      <div className="space-y-6">
        <SectionShell
          eyebrow="Cobro"
          title="Calculadora"
          description="Controla descuentos, forma de pago, efectivo recibido y abono inicial."
        >
          <div className="space-y-5">
            <label className="space-y-2">
              <span className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                Descuento global
              </span>
              <div className="relative">
                <BadgePercent className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.descuentoGlobal}
                  onChange={(event) =>
                    onChangeField('descuentoGlobal', event.target.value)
                  }
                  className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-11 text-white outline-none transition focus:border-emerald-400/50"
                />
              </div>
            </label>

            <label className="space-y-2">
              <span className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                Metodo de pago
              </span>
              <select
                value={draft.metodoPago}
                onChange={(event) =>
                  onChangeField('metodoPago', event.target.value)
                }
                className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none transition focus:border-emerald-400/50"
              >
                <option value="EFECTIVO">Efectivo</option>
                <option value="TARJETA">Tarjeta</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="CREDITO">Credito</option>
              </select>
            </label>

            {draft.metodoPago === 'EFECTIVO' && draft.estado === 'TERMINADA' && (
              <label className="space-y-2">
                <span className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  Efectivo recibido
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.efectivoRecibido}
                  onChange={(event) =>
                    onChangeField('efectivoRecibido', event.target.value)
                  }
                  className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none transition focus:border-emerald-400/50"
                />
              </label>
            )}

            {draft.metodoPago === 'CREDITO' && (
              <div className="grid gap-4">
                <label className="space-y-2">
                  <span className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                    Abono inicial
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.abonoInicial}
                    onChange={(event) =>
                      onChangeField('abonoInicial', event.target.value)
                    }
                    className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none transition focus:border-emerald-400/50"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                    Metodo del abono inicial
                  </span>
                  <select
                    value={draft.metodoAbonoInicial}
                    onChange={(event) =>
                      onChangeField('metodoAbonoInicial', event.target.value)
                    }
                    className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none transition focus:border-emerald-400/50"
                  >
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TARJETA">Tarjeta</option>
                    <option value="TRANSFERENCIA">Transferencia</option>
                  </select>
                </label>
              </div>
            )}

            <label className="space-y-2">
              <span className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                Observaciones
              </span>
              <textarea
                rows="4"
                value={draft.observaciones}
                onChange={(event) =>
                  onChangeField('observaciones', event.target.value)
                }
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-emerald-400/50"
              />
            </label>
          </div>
        </SectionShell>

        <SectionShell
          eyebrow="Resumen"
          title="Totales de la venta"
          description="Los calculos responden en tiempo real a cambios de cantidad, precio y descuento."
        >
          <div className="space-y-3">
            <SummaryRow label="Subtotal" value={resumen.subtotal} />
            <SummaryRow label="Impuestos" value={resumen.impuestos} />
            <SummaryRow label="Descuento lineas" value={resumen.descuentoLineas} />
            <SummaryRow label="Descuento global" value={resumen.descuentoGlobal} />
            <SummaryRow
              label="Total a pagar"
              value={resumen.total}
              featured
            />
            {draft.metodoPago === 'EFECTIVO' && draft.estado === 'TERMINADA' && (
              <SummaryRow label="Cambio" value={resumen.cambio} />
            )}
            {draft.metodoPago === 'CREDITO' && (
              <SummaryRow label="Saldo a credito" value={resumen.saldoCredito} />
            )}
          </div>

          {error && (
            <div className="mt-5 rounded-[20px] border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          )}

          {!canSubmit && (
            <div className="mt-5 rounded-[20px] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              Agrega al menos un producto y valida el efectivo recibido antes de
              cerrar una venta terminada.
            </div>
          )}

          <div className="mt-6 grid gap-3">
            <button
              type="button"
              onClick={() => submitWithState(draft.estado)}
              disabled={isLoading || !canSubmit}
              className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              {submitLabel}
            </button>
            <button
              type="button"
              onClick={() => submitWithState('PENDIENTE')}
              disabled={isLoading || draft.items.length === 0}
              className="min-h-12 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Guardar pendiente
            </button>
            <button
              type="button"
              onClick={onReset}
              className="min-h-12 rounded-2xl border border-white/10 bg-transparent px-5 py-3 font-semibold text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
            >
              Limpiar formulario
            </button>
          </div>
        </SectionShell>
      </div>

      <QuickClientModal
        open={showClientModal}
        onClose={() => setShowClientModal(false)}
        onCreate={async (payload) => {
          const cliente = await crearClienteTemporal(payload);
          onCreateQuickClient(cliente);
          setShowClientModal(false);
        }}
      />
    </div>
  );
}

function MiniField({ label, type, value, onChange, ...props }) {
  return (
    <label className="space-y-1">
      <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-3 text-white outline-none transition focus:border-emerald-400/50"
        {...props}
      />
    </label>
  );
}

function SummaryRow({ label, value, featured = false }) {
  return (
    <div
      className={`flex items-center justify-between rounded-[20px] border px-4 py-3 ${
        featured
          ? 'border-emerald-400/30 bg-emerald-400/10'
          : 'border-white/10 bg-white/[0.04]'
      }`}
    >
      <span className="text-sm text-slate-300">{label}</span>
      <span
        className={`font-display ${featured ? 'text-2xl text-white' : 'text-xl text-white'}`}
      >
        {formatCurrency(value)}
      </span>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex min-h-12 w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left"
    >
      <span className="text-sm font-semibold text-slate-100">{label}</span>
      <span
        className={`inline-flex h-7 w-14 items-center rounded-full p-1 transition ${
          checked ? 'bg-emerald-400/80' : 'bg-slate-700'
        }`}
      >
        <span
          className={`h-5 w-5 rounded-full bg-white transition ${
            checked ? 'translate-x-7' : 'translate-x-0'
          }`}
        />
      </span>
    </button>
  );
}

function QuickClientModal({ open, onClose, onCreate }) {
  const [form, setForm] = useState({
    nombre_completo: '',
    numero_documento: '',
    telefono: '',
    email: '',
  });

  if (!open) {
    return null;
  }

  const canSubmit =
    form.nombre_completo.trim().length >= 3 &&
    form.numero_documento.trim().length >= 3;

  const handleChange = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 px-4 py-8 backdrop-blur-md">
      <div className="surface w-full max-w-xl rounded-[28px] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
              Cliente rapido
            </div>
            <h3 className="mt-2 font-display text-2xl text-white">
              Registro temporal
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Se usa para operar la venta aun cuando el modulo de clientes no
              este expuesto en la API.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
          >
            Cerrar
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-semibold text-slate-200">
              Nombre o razon social
            </span>
            <input
              type="text"
              value={form.nombre_completo}
              onChange={(event) =>
                handleChange('nombre_completo', event.target.value)
              }
              className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none transition focus:border-emerald-400/50"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-200">
              Documento
            </span>
            <input
              type="text"
              value={form.numero_documento}
              onChange={(event) =>
                handleChange('numero_documento', event.target.value)
              }
              className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none transition focus:border-emerald-400/50"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-200">
              Telefono
            </span>
            <input
              type="text"
              value={form.telefono}
              onChange={(event) => handleChange('telefono', event.target.value)}
              className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none transition focus:border-emerald-400/50"
            />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-semibold text-slate-200">Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => handleChange('email', event.target.value)}
              className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none transition focus:border-emerald-400/50"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-slate-100 transition hover:bg-white/10"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => onCreate(form)}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4" />
            Usar cliente temporal
          </button>
        </div>
      </div>
    </div>
  );
}

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
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
import {
  calculateVentaTotals,
  CONSUMIDOR_FINAL,
  getSuggestedCashAmounts,
} from '../../utils/ventas';
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
  focusSignal = 0,
}) {
  const [productQuery, setProductQuery] = useState('');
  const [clientQuery, setClientQuery] = useState('');
  const [showClientModal, setShowClientModal] = useState(false);
  const [cashManualOverride, setCashManualOverride] = useState(false);
  const productSearchRef = useRef(null);
  const deferredProductQuery = useDeferredValue(productQuery.trim());
  const deferredClientQuery = useDeferredValue(clientQuery.trim());
  const showClientResults = deferredClientQuery.length >= 2;
  const autoCashEnabled =
    draft.metodoPago === 'EFECTIVO' && draft.estado === 'TERMINADA';
  const resumen = useMemo(() => calculateVentaTotals(draft), [draft]);
  const cashSuggestions = useMemo(
    () => getSuggestedCashAmounts(resumen.total),
    [resumen.total],
  );
  const efectivoRecibidoValue =
    autoCashEnabled &&
    !cashManualOverride &&
    (draft.efectivoRecibido === '' ||
      draft.efectivoRecibido === null ||
      draft.efectivoRecibido === undefined)
      ? String(resumen.efectivoRecibido)
      : draft.efectivoRecibido;

  useEffect(() => {
    productSearchRef.current?.focus();
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => {
      productSearchRef.current?.focus();
    });
  }, [focusSignal]);

  useEffect(() => {
    if (!autoCashEnabled) {
      setCashManualOverride(false);
    }
  }, [autoCashEnabled]);

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
    enabled: showClientResults,
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
    requestAnimationFrame(() => {
      productSearchRef.current?.focus();
    });
  };

  const submitWithState = (estado) => {
    onSubmit({
      ...draft,
      estado,
    });
  };

  const handleReset = () => {
    setProductQuery('');
    setClientQuery('');
    setCashManualOverride(false);
    onReset();
    requestAnimationFrame(() => {
      productSearchRef.current?.focus();
    });
  };

  const clearZeroFieldOnFocus = (field) => (event) => {
    if (String(event.target.value) === '0') {
      onChangeField(field, '');
    }
  };

  const handleCashReceivedFocus = (event) => {
    if (
      autoCashEnabled &&
      !cashManualOverride &&
      (draft.efectivoRecibido === '' ||
        draft.efectivoRecibido === null ||
        draft.efectivoRecibido === undefined)
    ) {
      setCashManualOverride(true);
      onChangeField('efectivoRecibido', '');
      return;
    }

    event.target.select();
  };

  const applyCashSuggestion = (amount) => {
    setCashManualOverride(true);
    onChangeField('efectivoRecibido', String(amount));
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.45fr_0.92fr]">
      <SectionShell
        eyebrow={draft.ventaId ? 'Edicion' : null}
        title={draft.ventaId ? `Editar ${draft.ventaId}` : null}
      >
        <div className="space-y-6">
          <div className="rounded-xl border border-app bg-white/76 p-5">
            <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
              <label className="app-field">
                <span className="app-field-label">Buscar producto</span>
                <div className="relative">
                  <ScanLine className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    ref={productSearchRef}
                    type="text"
                    value={productQuery}
                    onChange={(event) => setProductQuery(event.target.value)}
                    placeholder="Nombre, codigo interno o codigo de barras"
                    className="app-input min-h-11 px-11"
                  />
                </div>
              </label>
              <div className="rounded-xl border border-app bg-[var(--panel-soft)] px-4 py-3">
                <div className="eyebrow">Captura rapida</div>
                <div className="mt-2 flex items-center gap-2 text-[12px] text-soft">
                  <Barcode className="h-4 w-4 text-[var(--accent)]" />
                  Empieza por el producto y completa cliente o pago al final.
                </div>
              </div>
            </div>

            <div className="mt-4">
              {productosQuery.isFetching && (
                <div className="mb-3 inline-flex items-center gap-2 text-[13px] text-soft">
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
                        className="rounded-xl border border-app bg-white/72 p-4 text-left transition hover:border-[var(--accent-line)] hover:bg-white"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-[13px] font-semibold text-main">
                              {producto.nombre}
                            </div>
                            <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted">
                              {producto.codigo_interno || producto.codigo_barras}
                            </div>
                          </div>
                          <Plus className="h-4 w-4 text-[var(--accent)]" />
                        </div>
                        <div className="mt-3 flex items-center justify-between text-[12px] text-soft">
                          <span>IVA {producto.iva}%</span>
                          <span className="font-display text-base text-main">
                            {formatCurrency(producto.precio_venta)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
            </div>
          </div>

          <div className="rounded-xl border border-app bg-white/76 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="eyebrow">Productos agregados</div>
                <div className="mt-2 font-display text-xl text-main">
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
                    className="grid gap-3 rounded-xl border border-app bg-white/72 p-4 xl:grid-cols-[1.35fr_0.48fr_0.58fr_0.82fr_auto]"
                  >
                    <div>
                      <div className="text-[13px] font-semibold text-main">
                        {item.producto.nombre}
                      </div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted">
                        IVA {item.producto.iva}% · {item.producto.codigo_interno}
                      </div>
                    </div>
                    <MiniField
                      label="Cantidad"
                      type="number"
                      min="0"
                      step="1"
                      integerOnly
                      value={item.cantidad}
                      onChange={(value) =>
                        onUpdateItem(item.id, { cantidad: value })
                      }
                    />
                    <MiniField
                      label="Precio"
                      type="number"
                      min="0"
                      step="1"
                      integerOnly
                      value={item.precio_unitario}
                      onChange={(value) =>
                        onUpdateItem(item.id, { precio_unitario: value })
                      }
                    />
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-muted">
                        Total linea
                      </div>
                      <div className="font-display text-xl text-main">
                        {formatCurrency(item.total)}
                      </div>
                      <div className="text-[11px] text-soft">
                        {formatCurrency(item.subtotal)} + {formatCurrency(item.impuestos)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.id)}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[rgba(159,47,45,0.18)] bg-[var(--danger-soft)] px-4 py-2 text-[12px] font-semibold text-[var(--danger-text)] transition hover:bg-[rgba(253,235,236,0.9)]"
                    >
                      <Trash2 className="h-4 w-4" />
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="rounded-xl border border-app bg-white/76 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="eyebrow">Cliente</div>
                  <div className="mt-2 font-display text-xl text-main">
                    {selectedClient.nombre_completo}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowClientModal(true)}
                  className="app-button-secondary min-h-10"
                >
                  <UserPlus className="h-4 w-4" />
                  Cliente rapido
                </button>
              </div>

              <div className="mt-4 grid gap-3">
                <label className="app-field">
                  <span className="app-field-label">Buscar cliente</span>
                  <input
                    type="text"
                    value={clientQuery}
                    onChange={(event) => setClientQuery(event.target.value)}
                    placeholder="Nombre, documento o telefono"
                    className="app-input min-h-10"
                  />
                </label>
                {showClientResults && (
                  <div className="space-y-3">
                    {clientesQuery.isFetching && (
                      <div className="inline-flex items-center gap-2 text-[13px] text-soft">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Buscando clientes...
                      </div>
                    )}

                    {!clientesQuery.isFetching &&
                      (clientesQuery.data || []).length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {(clientesQuery.data || []).slice(0, 6).map((cliente) => (
                            <button
                              key={cliente.id ?? cliente.numero_documento}
                              type="button"
                              onClick={() => {
                                onSelectClient(cliente);
                                setClientQuery('');
                              }}
                              className={`rounded-full border px-3 py-2 text-[12px] transition ${
                                selectedClient.numero_documento ===
                                cliente.numero_documento
                                  ? 'border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]'
                                  : 'border-app bg-white/72 text-main hover:bg-white'
                              }`}
                            >
                              {cliente.nombre_completo}
                            </button>
                          ))}
                        </div>
                      )}

                    {!clientesQuery.isFetching &&
                      (clientesQuery.data || []).length === 0 && (
                        <div className="text-[12px] text-soft">
                          Sin coincidencias para esta busqueda.
                        </div>
                      )}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-app bg-white/76 p-5">
              <div className="eyebrow">Estado de salida</div>
              <div className="mt-4 flex flex-wrap gap-2">
                {['TERMINADA', 'PENDIENTE'].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onChangeField('estado', option)}
                    className={`rounded-full border px-4 py-2 text-[12px] font-semibold transition ${
                      draft.estado === option
                        ? 'border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]'
                        : 'border-app bg-white/72 text-main'
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

        </div>
      </SectionShell>

      <div className="space-y-6">
        <SectionShell
          eyebrow="Resumen"
          title="Totales de la venta"
          description="Los calculos responden en tiempo real a cambios de cantidad, precio y descuento."
        >
          <div className="space-y-3">
            <SummaryRow label="Subtotal" value={resumen.subtotal} />
            <SummaryRow label="Impuestos" value={resumen.impuestos} />
            <SummaryRow
              label="Descuento global"
              value={resumen.descuentoGlobal}
              helper={`${resumen.descuentoGlobalPercent.toFixed(2)}% aplicado`}
            />
            <SummaryRow
              label="Total a pagar"
              value={resumen.total}
              featured
            />
            {draft.metodoPago === 'CREDITO' && (
              <SummaryRow label="Saldo a credito" value={resumen.saldoCredito} />
            )}
          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-[rgba(159,47,45,0.18)] bg-[var(--danger-soft)] px-4 py-3 text-[13px] text-[var(--danger-text)]">
              {error}
            </div>
          )}

          {!canSubmit && (
            <div className="mt-5 rounded-xl border border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)] px-4 py-3 text-[13px] text-[var(--warning-text)]">
              Agrega al menos un producto y valida el efectivo recibido antes de
              cerrar una venta terminada.
            </div>
          )}

          <div className="mt-6 grid gap-3">
            <button
              type="button"
              onClick={() => submitWithState(draft.estado)}
              disabled={isLoading || !canSubmit}
              className="app-button-primary min-h-11 disabled:opacity-50"
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
              disabled={
                isLoading ||
                draft.items.length === 0 ||
                draft.estado === 'TERMINADA'
              }
              className="app-button-secondary min-h-10 disabled:opacity-50"
            >
              Guardar pendiente
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="app-button-ghost min-h-10 border border-app bg-white/40 px-5"
            >
              Limpiar formulario
            </button>
          </div>
        </SectionShell>
      </div>

      <SectionShell
        eyebrow="Cobro"
        title="Calculadora"
        description="Controla descuentos, forma de pago, efectivo recibido y abono inicial."
        className="xl:col-span-2"
      >
        <div className="grid gap-5 xl:grid-cols-2">
          <label className="space-y-2">
            <span className="app-field-label">Descuento global (%)</span>
            <div className="relative">
              <BadgePercent className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={draft.descuentoGlobal}
                onFocus={clearZeroFieldOnFocus('descuentoGlobal')}
                onChange={(event) =>
                  onChangeField('descuentoGlobal', event.target.value)
                }
                className="app-input min-h-10 px-11"
              />
            </div>
            <span className="text-[12px] text-soft">
              Porcentaje aplicado sobre el total actual de la venta.
            </span>
          </label>

          <label className="space-y-2">
            <span className="app-field-label">Metodo de pago</span>
            <select
              value={draft.metodoPago}
              onChange={(event) =>
                onChangeField('metodoPago', event.target.value)
              }
              className="app-select min-h-10"
            >
              <option value="EFECTIVO">Efectivo</option>
              <option value="TARJETA">Tarjeta</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="CREDITO">Credito</option>
            </select>
          </label>

          {draft.metodoPago === 'EFECTIVO' && draft.estado === 'TERMINADA' && (
            <div className="grid gap-4 xl:col-span-2 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
              <label className="space-y-2">
                <span className="app-field-label">Efectivo recibido</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={efectivoRecibidoValue}
                  onFocus={handleCashReceivedFocus}
                  onChange={(event) => {
                    setCashManualOverride(true);
                    onChangeField('efectivoRecibido', event.target.value);
                  }}
                  className="app-input min-h-10"
                />
                {cashSuggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {cashSuggestions.map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => applyCashSuggestion(amount)}
                        className="inline-flex min-h-9 items-center rounded-full border border-app bg-white/72 px-3 py-2 text-[12px] font-semibold text-main transition hover:border-[var(--accent-line)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
                      >
                        {formatCurrency(amount)}
                      </button>
                    ))}
                  </div>
                )}
              </label>
              <div className="self-start">
                <CashChangeCard value={resumen.cambio} />
              </div>
            </div>
          )}

          {draft.metodoPago === 'CREDITO' && (
            <>
              <label className="space-y-2">
                <span className="app-field-label">Abono inicial</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.abonoInicial}
                  onChange={(event) =>
                    onChangeField('abonoInicial', event.target.value)
                  }
                  className="app-input min-h-10"
                />
              </label>
              <label className="space-y-2">
                <span className="app-field-label">Metodo del abono inicial</span>
                <select
                  value={draft.metodoAbonoInicial}
                  onChange={(event) =>
                    onChangeField('metodoAbonoInicial', event.target.value)
                  }
                  className="app-select min-h-10"
                >
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TARJETA">Tarjeta</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                </select>
              </label>
            </>
          )}

          <label className="space-y-2 xl:col-span-2">
            <span className="app-field-label">Observaciones</span>
            <textarea
              rows="4"
              value={draft.observaciones}
              onChange={(event) =>
                onChangeField('observaciones', event.target.value)
              }
              className="app-textarea"
            />
          </label>
        </div>
      </SectionShell>

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

function MiniField({ label, type, value, onChange, integerOnly = false, ...props }) {
  const handleFocus = (event) => {
    if (String(value) === '0') {
      onChange('');
      return;
    }

    event.target.select();
  };

  const handleBlur = (event) => {
    if (!integerOnly || event.target.value === '') {
      return;
    }

    onChange(String(Math.round(Number(event.target.value) || 0)));
  };

  return (
    <label className="space-y-1">
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={(event) => onChange(event.target.value)}
        className="app-input min-h-10 px-3"
        {...props}
      />
    </label>
  );
}

function SummaryRow({ label, value, featured = false, helper = null }) {
  return (
    <div
      className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
        featured
          ? 'border-[var(--accent-line)] bg-[var(--accent-soft)]'
          : 'border-app bg-white/72'
      }`}
    >
      <div>
        <div className={`text-[13px] ${featured ? 'text-[var(--accent)]' : 'text-soft'}`}>
          {label}
        </div>
        {helper && <div className="mt-1 text-[11px] text-soft">{helper}</div>}
      </div>
      <span
        className={`font-display ${featured ? 'text-2xl text-main' : 'text-xl text-main'}`}
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
      className="flex min-h-10 w-full items-center justify-between rounded-md border border-app bg-white/72 px-4 py-3 text-left"
    >
      <span className="text-[13px] font-semibold text-main">{label}</span>
      <span
        className={`inline-flex h-7 w-14 items-center rounded-full p-1 transition ${
          checked ? 'bg-[var(--accent)]' : 'bg-slate-500'
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

function CashChangeCard({ value }) {
  return (
    <div className="rounded-xl border border-[rgba(31,108,159,0.18)] bg-[var(--info-soft)] px-5 py-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--info-text)]">
        Cambio
      </div>
      <div className="mt-3 font-display text-[2rem] leading-none text-main">
        {formatCurrency(value)}
      </div>
      <div className="mt-2 text-[12px] text-[var(--info-text)]">
        Devuelta sugerida
      </div>
    </div>
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
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/40 px-4 py-8 backdrop-blur-sm">
      <div className="surface w-full max-w-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="eyebrow">Cliente rapido</div>
            <h3 className="mt-2 font-display text-2xl text-main">
              Registro temporal
            </h3>
            <p className="mt-2 text-[13px] leading-6 text-soft">
              Se usa para operar la venta aun cuando el modulo de clientes no
              este expuesto en la API.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="app-button-secondary min-h-10"
          >
            Cerrar
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 md:col-span-2">
            <span className="text-[13px] font-semibold text-main">
              Nombre o razon social
            </span>
            <input
              type="text"
              value={form.nombre_completo}
              onChange={(event) =>
                handleChange('nombre_completo', event.target.value)
              }
              className="app-input min-h-10"
            />
          </label>
          <label className="space-y-2">
            <span className="text-[13px] font-semibold text-main">
              Documento
            </span>
            <input
              type="text"
              value={form.numero_documento}
              onChange={(event) =>
                handleChange('numero_documento', event.target.value)
              }
              className="app-input min-h-10"
            />
          </label>
          <label className="space-y-2">
            <span className="text-[13px] font-semibold text-main">
              Telefono
            </span>
            <input
              type="text"
              value={form.telefono}
              onChange={(event) => handleChange('telefono', event.target.value)}
              className="app-input min-h-10"
            />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-[13px] font-semibold text-main">Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => handleChange('email', event.target.value)}
              className="app-input min-h-10"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="app-button-secondary min-h-10"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => onCreate(form)}
            className="app-button-primary min-h-10 disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4" />
            Usar cliente temporal
          </button>
        </div>
      </div>
    </div>
  );
}

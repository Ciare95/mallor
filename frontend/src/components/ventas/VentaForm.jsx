import {
  createElement,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BadgePercent,
  Building2,
  CreditCard,
  Loader2,
  Plus,
  ScanLine,
  Sparkles,
  Trash2,
  UserPlus,
  UserRound,
} from 'lucide-react';
import { buscarProductos } from '../../services/inventario.service';
import {
  autocompletarClientePos,
  buscarClientesVenta,
  crearClientePosRapido,
} from '../../services/ventas.service';
import MunicipioLookupField from '../forms/MunicipioLookupField';
import {
  calculateVentaTotals,
  CONSUMIDOR_FINAL,
  createTemporaryProduct,
  getSuggestedCashAmounts,
} from '../../utils/ventas';
import {
  buildClientePayload,
  createClienteFormState,
  DOCUMENTO_LABELS,
  TIPO_CLIENTE_LABELS,
  validateClienteForm,
} from '../../utils/clientes';
import { formatCurrency } from '../../utils/formatters';
import { getDepartamentoByMunicipioCode } from '../../utils/municipios';
import {
  calculateNitVerificationDigit,
  sanitizeNumeric,
} from '../../utils/nit';
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
  disabled = false,
  focusSignal = 0,
  openCobroSignal = 0,
  submitSignal = 0,
}) {
  const [productQuery, setProductQuery] = useState('');
  const [clientQuery, setClientQuery] = useState('');
  const [showClientModal, setShowClientModal] = useState(false);
  const [showCobroModal, setShowCobroModal] = useState(false);
  const [cashManualOverride, setCashManualOverride] = useState(false);
  const [activeProductIndex, setActiveProductIndex] = useState(-1);
  const [pendingSpecialProduct, setPendingSpecialProduct] = useState(null);
  const [specialPrice, setSpecialPrice] = useState('');
  const [specialPriceError, setSpecialPriceError] = useState('');
  const [showTemporaryProductModal, setShowTemporaryProductModal] = useState(false);
  const [temporaryProductForm, setTemporaryProductForm] = useState({
    nombre: '',
    precio: '',
  });
  const [temporaryProductError, setTemporaryProductError] = useState('');
  const productSearchRef = useRef(null);
  const lastCobroSignalRef = useRef(0);
  const lastSubmitSignalRef = useRef(0);
  const productResultsId = useRef(
    `ventas-product-results-${Math.random().toString(36).slice(2, 8)}`,
  );
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
  const productResults = useMemo(
    () => (productosQuery.data || []).slice(0, 6),
    [productosQuery.data],
  );
  const canSubmit =
    !disabled &&
    draft.items.length > 0 &&
    (
      draft.metodoPago !== 'EFECTIVO' ||
      draft.estado !== 'TERMINADA' ||
      resumen.efectivoRecibido >= resumen.total
    );

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

  useEffect(() => {
    setActiveProductIndex(-1);
  }, [deferredProductQuery]);

  useEffect(() => {
    if (!productResults.length) {
      setActiveProductIndex(-1);
      return;
    }
    if (activeProductIndex >= productResults.length) {
      setActiveProductIndex(productResults.length - 1);
    }
  }, [activeProductIndex, productResults]);

  useEffect(() => {
    if (!openCobroSignal || openCobroSignal === lastCobroSignalRef.current) {
      return;
    }
    lastCobroSignalRef.current = openCobroSignal;
    setShowCobroModal(true);
  }, [openCobroSignal]);

  useEffect(() => {
    if (
      !submitSignal ||
      submitSignal === lastSubmitSignalRef.current
    ) {
      return;
    }
    lastSubmitSignalRef.current = submitSignal;
    if (disabled || showCobroModal || !canSubmit) {
      return;
    }
    onSubmit({
      ...draft,
      estado: draft.estado,
    });
  }, [canSubmit, disabled, draft, onSubmit, showCobroModal, submitSignal]);

  const submitLabel =
    draft.estado === 'PENDIENTE' ? 'Guardar como pendiente' : 'Registrar venta';

  const clearProductSearch = () => {
    setProductQuery('');
    setActiveProductIndex(-1);
    requestAnimationFrame(() => {
      productSearchRef.current?.focus();
    });
  };

  const addProductAndClear = (producto) => {
    if (producto.es_producto_especial) {
      setPendingSpecialProduct(producto);
      setSpecialPrice(
        Number(producto.precio_venta || 0) > 0
          ? String(Math.round(Number(producto.precio_venta)))
          : '',
      );
      setSpecialPriceError('');
      return;
    }

    onAddProduct(producto);
    clearProductSearch();
  };

  const closeSpecialPriceModal = () => {
    setPendingSpecialProduct(null);
    setSpecialPrice('');
    setSpecialPriceError('');
    requestAnimationFrame(() => {
      productSearchRef.current?.focus();
    });
  };

  const submitSpecialProduct = (event) => {
    event.preventDefault();
    const price = Math.round(Number(specialPrice || 0));
    if (!Number.isFinite(price) || price <= 0) {
      setSpecialPriceError('El precio debe ser mayor que cero.');
      return;
    }

    onAddProduct(pendingSpecialProduct, { precio_unitario: price });
    closeSpecialPriceModal();
    clearProductSearch();
  };

  const closeTemporaryProductModal = () => {
    setShowTemporaryProductModal(false);
    setTemporaryProductForm({ nombre: '', precio: '' });
    setTemporaryProductError('');
    requestAnimationFrame(() => {
      productSearchRef.current?.focus();
    });
  };

  const submitTemporaryProduct = (event) => {
    event.preventDefault();
    const nombre = temporaryProductForm.nombre.trim();
    const precio = Math.round(Number(temporaryProductForm.precio || 0));

    if (!nombre) {
      setTemporaryProductError('El nombre es obligatorio.');
      return;
    }
    if (!Number.isFinite(precio) || precio <= 0) {
      setTemporaryProductError('El precio debe ser mayor que cero.');
      return;
    }

    const productoTemporal = createTemporaryProduct({ nombre, precio });
    onAddProduct(productoTemporal, { precio_unitario: precio });
    closeTemporaryProductModal();
    clearProductSearch();
  };

  const submitWithState = (estado) => {
    if (disabled) {
      return;
    }
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

  const handleProductSearchKeyDown = (event) => {
    if (!productResults.length) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveProductIndex((current) =>
        current < productResults.length - 1 ? current + 1 : 0,
      );
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveProductIndex((current) =>
        current > 0 ? current - 1 : productResults.length - 1,
      );
      return;
    }

    if (event.key === 'Enter') {
      const activeProduct =
        activeProductIndex >= 0
          ? productResults[activeProductIndex]
          : productResults.length === 1
            ? productResults[0]
            : null;
      if (!activeProduct) {
        return;
      }

      event.preventDefault();
      addProductAndClear(activeProduct);
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1.45fr_0.92fr]">
      <SectionShell
        eyebrow={draft.ventaId ? 'Edicion' : null}
        title={draft.ventaId ? `Editar ${draft.ventaId}` : null}
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-app bg-white/76 p-4">
            <div className="grid gap-3">
              <label className="app-field">
                <span className="app-field-label">Buscar producto</span>
                <div className="relative">
                  <ScanLine className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    ref={productSearchRef}
                    type="text"
                    value={productQuery}
                    onChange={(event) => setProductQuery(event.target.value)}
                    onKeyDown={handleProductSearchKeyDown}
                    placeholder="Nombre, codigo interno o codigo de barras"
                    className="app-input min-h-11 px-11"
                    aria-controls={productResultsId.current}
                    aria-activedescendant={
                      activeProductIndex >= 0
                        ? `${productResultsId.current}-${productResults[activeProductIndex]?.id}`
                        : undefined
                    }
                    aria-autocomplete="list"
                    aria-expanded={productResults.length > 0}
                    role="combobox"
                  />
                </div>
              </label>
              <button
                type="button"
                onClick={() => setShowTemporaryProductModal(true)}
                className="app-button-secondary min-h-11 w-full justify-center sm:w-auto"
              >
                <Sparkles className="h-4 w-4" />
                Producto temporal
              </button>
            </div>

            <div className="mt-3">
              {productosQuery.isFetching && (
                <div className="mb-3 inline-flex items-center gap-2 text-[13px] text-soft">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Buscando productos...
                </div>
              )}

              {deferredProductQuery.length >= 2 &&
                !productosQuery.isFetching &&
                productResults.length > 0 && (
                  <div
                    id={productResultsId.current}
                    role="listbox"
                    className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
                  >
                    {productResults.map((producto, index) => (
                      <button
                        key={producto.id}
                        id={`${productResultsId.current}-${producto.id}`}
                        type="button"
                        onClick={() => addProductAndClear(producto)}
                        role="option"
                        aria-selected={activeProductIndex === index}
                        className={`rounded-xl border p-4 text-left transition ${
                          activeProductIndex === index
                            ? 'border-[var(--accent-line)] bg-[var(--accent-soft)]'
                            : 'border-app bg-white/72 hover:border-[var(--accent-line)] hover:bg-white'
                        }`}
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
                          <span>
                            {producto.es_producto_especial
                              ? 'Precio variable'
                              : `IVA ${producto.iva}%`}
                          </span>
                          <span className="font-display text-base text-main">
                            {producto.es_producto_especial &&
                            Number(producto.precio_venta || 0) <= 0
                              ? 'Variable'
                              : formatCurrency(producto.precio_venta)}
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
                        {item.producto.es_producto_especial
                          ? ' · Precio variable'
                          : ''}
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
                      label={
                        item.producto.es_producto_especial
                          ? 'Precio'
                          : 'Precio fijo'
                      }
                      type="number"
                      min="0"
                      step="1"
                      integerOnly
                      value={item.precio_unitario}
                      onChange={(value) =>
                        onUpdateItem(item.id, { precio_unitario: value })
                      }
                      disabled={!item.producto.es_producto_especial}
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
                  Crear cliente
                </button>
              </div>

              <div className="mt-4 grid gap-3">
                {draft.facturaElectronica &&
                  !selectedClient.municipio_codigo && (
                    <div className="rounded-xl border border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)] px-4 py-3 text-[12px] text-[var(--warning-text)]">
                      El cliente necesita codigo de municipio para emitir factura electronica.
                    </div>
                  )}
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
                {draft.imprimirTicket && (
                  <div className="rounded-xl border border-[rgba(31,108,159,0.18)] bg-[var(--info-soft)] px-4 py-3 text-[12px] text-[var(--info-text)]">
                    Al terminar la venta se abrira el modal del formato de la
                    tirilla para revisar la vista previa antes de imprimir.
                  </div>
                )}
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

          {disabled && (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
              Abre caja en esta terminal para registrar ventas locales.
            </div>
          )}

          {!disabled && !canSubmit && (
            <div className="mt-5 rounded-xl border border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)] px-4 py-3 text-[13px] text-[var(--warning-text)]">
              Agrega al menos un producto y valida el efectivo recibido antes de
              cerrar una venta terminada.
            </div>
          )}

          <div className="mt-6 grid gap-3">
            <button
              type="button"
              onClick={() => setShowCobroModal(true)}
              className="app-button-secondary min-h-10"
            >
              <CreditCard className="h-4 w-4" />
              Configurar cobro
            </button>
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

      <QuickClientModal
        open={showClientModal}
        onClose={() => setShowClientModal(false)}
        onCreate={async (payload) => {
          const cliente = await crearClientePosRapido(payload);
          onCreateQuickClient(cliente);
          setShowClientModal(false);
        }}
        facturaElectronica={draft.facturaElectronica}
      />

      <CobroModal
        open={showCobroModal}
        onClose={() => setShowCobroModal(false)}
        draft={draft}
        resumen={resumen}
        onChangeField={onChangeField}
        cashSuggestions={cashSuggestions}
        efectivoRecibidoValue={efectivoRecibidoValue}
        clearZeroFieldOnFocus={clearZeroFieldOnFocus}
        handleCashReceivedFocus={handleCashReceivedFocus}
        applyCashSuggestion={applyCashSuggestion}
        setCashManualOverride={setCashManualOverride}
      />

      {showTemporaryProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/42 px-4">
          <form
            onSubmit={submitTemporaryProduct}
            className="w-full max-w-sm rounded-xl border border-app bg-white p-5 shadow-2xl"
          >
            <div className="eyebrow">Venta rapida</div>
            <h3 className="mt-2 text-lg font-semibold text-main">
              Producto temporal
            </h3>
            <p className="mt-1 text-[12px] leading-5 text-soft">
              Esta linea queda registrada solo en la venta.
            </p>
            <label className="mt-4 block space-y-1">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
                Nombre
              </span>
              <input
                autoFocus
                type="text"
                value={temporaryProductForm.nombre}
                onChange={(event) => {
                  setTemporaryProductForm((current) => ({
                    ...current,
                    nombre: event.target.value,
                  }));
                  setTemporaryProductError('');
                }}
                className="app-input min-h-11"
              />
            </label>
            <label className="mt-4 block space-y-1">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
                Precio
              </span>
              <input
                type="number"
                min="1"
                step="1"
                value={temporaryProductForm.precio}
                onChange={(event) => {
                  setTemporaryProductForm((current) => ({
                    ...current,
                    precio: event.target.value,
                  }));
                  setTemporaryProductError('');
                }}
                className="app-input min-h-11"
              />
            </label>
            {temporaryProductError && (
              <p className="mt-2 text-[12px] font-semibold text-[var(--danger-text)]">
                {temporaryProductError}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeTemporaryProductModal}
                className="app-button-secondary min-h-10"
              >
                Cancelar
              </button>
              <button type="submit" className="app-button-primary min-h-10">
                Agregar
              </button>
            </div>
          </form>
        </div>
      )}

      {pendingSpecialProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/42 px-4">
          <form
            onSubmit={submitSpecialProduct}
            className="w-full max-w-sm rounded-xl border border-app bg-white p-5 shadow-2xl"
          >
            <div className="eyebrow">Producto especial</div>
            <h3 className="mt-2 text-lg font-semibold text-main">
              {pendingSpecialProduct.nombre}
            </h3>
            <p className="mt-1 text-[12px] leading-5 text-soft">
              Define el precio para esta linea de venta.
            </p>
            <label className="mt-4 block space-y-1">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
                Precio
              </span>
              <input
                autoFocus
                type="number"
                min="1"
                step="1"
                value={specialPrice}
                onChange={(event) => {
                  setSpecialPrice(event.target.value);
                  setSpecialPriceError('');
                }}
                className="app-input min-h-11"
              />
            </label>
            {specialPriceError && (
              <p className="mt-2 text-[12px] font-semibold text-[var(--danger-text)]">
                {specialPriceError}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeSpecialPriceModal}
                className="app-button-secondary min-h-10"
              >
                Cancelar
              </button>
              <button type="submit" className="app-button-primary min-h-10">
                Agregar
              </button>
            </div>
          </form>
        </div>
      )}
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

function preventStepperKeys(event) {
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.preventDefault();
  }
}

function CobroFields({
  draft,
  resumen,
  onChangeField,
  cashSuggestions,
  efectivoRecibidoValue,
  clearZeroFieldOnFocus,
  handleCashReceivedFocus,
  applyCashSuggestion,
  setCashManualOverride,
  firstFieldRef,
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <label className="space-y-2">
        <span className="app-field-label">Descuento global (%)</span>
        <div className="relative">
          <BadgePercent className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            ref={firstFieldRef}
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={draft.descuentoGlobal}
            onFocus={clearZeroFieldOnFocus('descuentoGlobal')}
            onKeyDown={preventStepperKeys}
            onChange={(event) =>
              onChangeField('descuentoGlobal', event.target.value)
            }
            className="app-input app-input-no-spin min-h-10 px-11"
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
              onKeyDown={preventStepperKeys}
              onChange={(event) => {
                setCashManualOverride(true);
                onChangeField('efectivoRecibido', event.target.value);
              }}
              className="app-input app-input-no-spin min-h-10"
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
              onKeyDown={preventStepperKeys}
              onChange={(event) =>
                onChangeField('abonoInicial', event.target.value)
              }
              className="app-input app-input-no-spin min-h-10"
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
  );
}

function CobroModal({
  open,
  onClose,
  draft,
  resumen,
  onChangeField,
  cashSuggestions,
  efectivoRecibidoValue,
  clearZeroFieldOnFocus,
  handleCashReceivedFocus,
  applyCashSuggestion,
  setCashManualOverride,
}) {
  const firstFieldRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    requestAnimationFrame(() => {
      firstFieldRef.current?.focus();
    });
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/40 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Configurar cobro"
    >
      <div className="surface w-full max-w-4xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="eyebrow">Cobro</div>
            <h3 className="mt-2 font-display text-2xl text-main">
              Configuracion de pago
            </h3>
            <p className="mt-2 text-[13px] leading-6 text-soft">
              Controla descuentos, forma de pago, efectivo recibido y abono
              inicial antes de registrar la venta.
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

        <div className="mt-6">
          <CobroFields
            draft={draft}
            resumen={resumen}
            onChangeField={onChangeField}
            cashSuggestions={cashSuggestions}
            efectivoRecibidoValue={efectivoRecibidoValue}
            clearZeroFieldOnFocus={clearZeroFieldOnFocus}
            handleCashReceivedFocus={handleCashReceivedFocus}
            applyCashSuggestion={applyCashSuggestion}
            setCashManualOverride={setCashManualOverride}
            firstFieldRef={firstFieldRef}
          />
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="app-button-primary min-h-10"
          >
            Aplicar y cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function QuickClientModal({ open, onClose, onCreate, facturaElectronica }) {
  const [form, setForm] = useState(() => createClienteFormState());
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [helperMessage, setHelperMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const deferredDocumento = useDeferredValue(form.numero_documento.trim());

  useEffect(() => {
    if (!open) {
      setForm(createClienteFormState());
      setErrors({});
      setSubmitError('');
      setHelperMessage('');
      setIsSaving(false);
    }
  }, [open]);

  const autocompleteQuery = useQuery({
    queryKey: [
      'ventas',
      'pos',
      'cliente-autocompletar',
      form.tipo_documento,
      deferredDocumento,
    ],
    queryFn: () =>
      autocompletarClientePos({
        tipoDocumento: form.tipo_documento,
        numeroDocumento: deferredDocumento,
      }),
    enabled: open && deferredDocumento.length >= 3,
    retry: false,
  });

  if (!open) {
    return null;
  }

  const validationErrors = validateClienteForm({
    form,
    duplicateDocument: false,
  });
  const canSubmit = Object.keys(validationErrors).length === 0 && !isSaving;
  const autocompleteAvailable = Boolean(autocompleteQuery.data?.found);

  const setField = (field, value) => {
    setForm((current) => {
      const isNitDocument = current.tipo_documento === 'NIT';
      const normalizedValue =
        field === 'numero_documento' && isNitDocument
          ? sanitizeNumeric(value)
          : value;
      const next = {
        ...current,
        [field]: normalizedValue,
      };

      if (field === 'tipo_documento') {
        next.tipo_cliente = value === 'NIT' ? 'JURIDICO' : current.tipo_cliente;
        next.digito_verificacion =
          value === 'NIT'
            ? calculateNitVerificationDigit(next.numero_documento)
            : '';
      }

      if (field === 'numero_documento') {
        next.digito_verificacion =
          current.tipo_documento === 'NIT'
            ? calculateNitVerificationDigit(normalizedValue)
            : '';
      }

      return next;
    });
    setErrors((current) => ({ ...current, [field]: undefined }));
    if (field === 'tipo_documento' || field === 'numero_documento') {
      setHelperMessage('');
    }
    setSubmitError('');
  };

  const setMunicipio = (municipio) => {
    setForm((current) => ({
      ...current,
      ciudad: municipio?.name || '',
      departamento: municipio
        ? getDepartamentoByMunicipioCode(municipio.code)
        : '',
      municipio_codigo: municipio?.code || '',
    }));
    setErrors((current) => ({
      ...current,
      municipio_codigo: undefined,
      ciudad: undefined,
      departamento: undefined,
    }));
  };

  const markValidationErrors = () => {
    setErrors(validationErrors);
    return validationErrors;
  };

  const handleAutocomplete = () => {
    if (!autocompleteAvailable) {
      return;
    }

    const data = autocompleteQuery.data;
    setForm((current) => ({
      ...current,
      tipo_cliente: data.tipo_cliente || current.tipo_cliente,
      tipo_documento: data.tipo_documento || current.tipo_documento,
      numero_documento: data.numero_documento || current.numero_documento,
      digito_verificacion:
        data.digito_verificacion || current.digito_verificacion,
      nombre: data.nombre || current.nombre,
      razon_social: data.razon_social || current.razon_social,
      email: data.email || current.email,
    }));
    setHelperMessage('Datos cargados. Revisa y completa el resto.');
  };

  const handleSubmit = async () => {
    const currentErrors = markValidationErrors();
    if (Object.keys(currentErrors).length > 0) {
      return;
    }

    setIsSaving(true);
    setSubmitError('');
    try {
      await onCreate(buildClientePayload(form));
    } catch (error) {
      setSubmitError(
        error?.response?.data?.error ||
        'No fue posible crear el cliente desde POS.',
      );
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/40 px-4 py-8 backdrop-blur-sm">
      <div className="surface w-full max-w-3xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="eyebrow">Cliente POS</div>
            <h3 className="mt-2 font-display text-2xl text-main">
              Crear cliente rapido
            </h3>
            <p className="mt-2 text-[13px] leading-6 text-soft">
              Registra el cliente sin salir de la venta. Queda disponible de inmediato para POS y facturacion.
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

        {facturaElectronica && (
          <div className="mt-4 rounded-xl border border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)] px-4 py-3 text-[12px] text-[var(--warning-text)]">
            Esta venta solicita factura electronica. Completa municipio, direccion y telefono para evitar rechazo al emitir.
          </div>
        )}

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <label className="app-field">
            <span className="app-field-label">Tipo de cliente</span>
            <select
              value={form.tipo_cliente}
              onChange={(event) => setField('tipo_cliente', event.target.value)}
              className="app-select min-h-11"
            >
              {Object.entries(TIPO_CLIENTE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="app-field">
            <span className="app-field-label">Tipo de documento</span>
            <select
              value={form.tipo_documento}
              onChange={(event) => setField('tipo_documento', event.target.value)}
              className="app-select min-h-11"
            >
              {Object.entries(DOCUMENTO_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="app-field">
            <div className="flex items-center justify-between gap-3">
              <span className="app-field-label">Numero de documento</span>
              {deferredDocumento.length >= 3 && !autocompleteQuery.isFetching && (
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                    autocompleteAvailable
                      ? 'border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]'
                      : 'border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)] text-[var(--warning-text)]'
                  }`}
                >
                  {autocompleteAvailable ? 'Disponible' : 'No disponible'}
                </span>
              )}
            </div>
            <input
              type="text"
              value={form.numero_documento}
              onChange={(event) => setField('numero_documento', event.target.value)}
              className={`app-input min-h-11 ${errors.numero_documento ? 'border-[var(--danger)]' : ''}`}
            />
            {errors.numero_documento && (
              <span className="text-[12px] text-[var(--danger)]">
                {errors.numero_documento}
              </span>
            )}
          </label>
          <div className="grid gap-2">
            {form.tipo_documento === 'NIT' ? (
              <label className="app-field">
                <span className="app-field-label">Digito de verificacion</span>
                <input
                  type="text"
                  readOnly
                  value={form.digito_verificacion}
                  className="app-input min-h-11 bg-[var(--panel-soft)] text-soft"
                />
              </label>
            ) : (
              <div />
            )}
            <button
              type="button"
              onClick={handleAutocomplete}
              disabled={autocompleteQuery.isFetching || !autocompleteAvailable}
              className="app-button-secondary min-h-11 justify-center"
            >
              {autocompleteQuery.isFetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Autocompletar datos
            </button>
          </div>
          {form.tipo_cliente === 'NATURAL' ? (
            <QuickClientInput
              label="Nombre completo"
              value={form.nombre}
              error={errors.nombre}
              icon={UserRound}
              onChange={(value) => setField('nombre', value)}
              className="lg:col-span-2"
            />
          ) : (
            <QuickClientInput
              label="Razon social"
              value={form.razon_social}
              error={errors.razon_social}
              icon={Building2}
              onChange={(value) => setField('razon_social', value)}
              className="lg:col-span-2"
            />
          )}
          {form.tipo_cliente === 'JURIDICO' && (
            <QuickClientInput
              label="Nombre comercial"
              value={form.nombre_comercial}
              onChange={(value) => setField('nombre_comercial', value)}
              className="lg:col-span-2"
            />
          )}
          <QuickClientInput
            label="Telefono"
            value={form.telefono}
            error={errors.telefono}
            onChange={(value) => setField('telefono', value)}
          />
          <QuickClientInput
            label="Correo"
            type="email"
            value={form.email}
            error={errors.email}
            onChange={(value) => setField('email', value)}
          />
          <QuickClientInput
            label="Direccion"
            value={form.direccion}
            error={errors.direccion}
            onChange={(value) => setField('direccion', value)}
            className="lg:col-span-2"
          />
          <div className="lg:col-span-2">
            <MunicipioLookupField
              label="Municipio DIAN"
              code={form.municipio_codigo}
              required
              error={errors.municipio_codigo}
              helper="Selecciona el municipio para completar ciudad y departamento."
              onCodeChange={(value) => setField('municipio_codigo', value)}
              onMunicipioSelect={setMunicipio}
            />
          </div>
        </div>

        {helperMessage && (
          <div className="mt-4 rounded-xl border border-[rgba(31,108,159,0.18)] bg-[var(--info-soft)] px-4 py-3 text-[12px] text-[var(--info-text)]">
            {helperMessage}
          </div>
        )}

        {!helperMessage && deferredDocumento.length >= 3 && autocompleteQuery.isFetching && (
          <div className="mt-4 rounded-xl border border-[rgba(31,108,159,0.18)] bg-[var(--info-soft)] px-4 py-3 text-[12px] text-[var(--info-text)]">
            Consultando si el documento existe.
          </div>
        )}

        {!helperMessage
          && deferredDocumento.length >= 3
          && !autocompleteQuery.isFetching
          && autocompleteAvailable && (
            <div className="mt-4 rounded-xl border border-[var(--accent-line)] bg-[var(--accent-soft)] px-4 py-3 text-[12px] text-[var(--accent)]">
              Documento encontrado. Ya puedes usar autocompletar.
            </div>
          )}

        {!helperMessage
          && deferredDocumento.length >= 3
          && !autocompleteQuery.isFetching
          && !autocompleteAvailable
          && !autocompleteQuery.isError && (
            <div className="mt-4 rounded-xl border border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)] px-4 py-3 text-[12px] text-[var(--warning-text)]">
              Documento no encontrado. El boton queda bloqueado y puedes continuar manualmente.
            </div>
          )}

        {!helperMessage
          && deferredDocumento.length >= 3
          && autocompleteQuery.isError && (
            <div className="mt-4 rounded-xl border border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)] px-4 py-3 text-[12px] text-[var(--warning-text)]">
              No fue posible validar el documento. Puedes completar el cliente manualmente.
            </div>
          )}

        {submitError && (
          <div className="mt-4 rounded-xl border border-[rgba(159,47,45,0.18)] bg-[var(--danger-soft)] px-4 py-3 text-[12px] text-[var(--danger-text)]">
            {submitError}
          </div>
        )}

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
            onClick={handleSubmit}
            className="app-button-primary min-h-10 disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            Crear y usar cliente
          </button>
        </div>
      </div>
    </div>
  );
}

function QuickClientInput({
  label,
  value,
  onChange,
  error,
  icon,
  type = 'text',
  className = '',
}) {
  const iconNode = icon
    ? createElement(icon, {
        className:
          'pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted',
      })
    : null;

  return (
    <label className={`app-field ${className}`.trim()}>
      <span className="app-field-label">{label}</span>
      <div className="relative">
        {iconNode}
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`app-input min-h-11 ${icon ? 'pl-10' : ''} ${error ? 'border-[var(--danger)]' : ''}`}
        />
      </div>
      {error && <span className="text-[12px] text-[var(--danger)]">{error}</span>}
    </label>
  );
}

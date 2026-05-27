import { useDeferredValue, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileSearch,
  Lock,
  Loader2,
  PackagePlus,
  Plus,
  Save,
  Search,
  Trash2,
  Unlock,
} from 'lucide-react';
import {
  buscarProductos,
  listarFacturasCompra,
} from '../../services/inventario.service';
import { useInventarioStore } from '../../store/useInventarioStore';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  calculateSuggestedSalePrice,
  roundCurrencyInput,
} from '../../utils/inventarioPricing';

const getResults = (data) => data?.results || data || [];

const emptyDetail = {
  producto: '',
  producto_nombre: '',
  cantidad: '1',
  precio_unitario: '',
  precio_unitario_actual: '',
  precio_venta_sugerido: '',
  precio_venta_actual: '',
  iva: '0',
  iva_bloqueado: true,
  descuento: '0',
};

const roundPercentInput = (value) => String(Math.round(Number(value || 0)));
const resolveInvoiceIvaPercent = (ivaValue, subtotalValue) => {
  const iva = Number(ivaValue || 0);
  const subtotal = Number(subtotalValue || 0);
  if (!Number.isFinite(iva) || iva <= 0) return '0';
  if (iva <= 100) return roundPercentInput(iva);
  if (subtotal > 0) return roundPercentInput((iva / subtotal) * 100);
  return '0';
};
const newDetailWithIva = (ivaPercent) => ({
  ...emptyDetail,
  iva: ivaPercent || '0',
  iva_bloqueado: true,
});

const toDetailDraft = (detalle, defaultIva = '0') => ({
  producto: detalle?.producto ? String(detalle.producto) : '',
  producto_nombre: detalle?.producto_nombre || '',
  cantidad: detalle?.cantidad ? String(Math.round(Number(detalle.cantidad))) : '1',
  precio_unitario: detalle?.precio_unitario
    ? String(Math.round(Number(detalle.precio_unitario)))
    : '',
  precio_unitario_actual: detalle?.precio_unitario
    ? String(Math.round(Number(detalle.precio_unitario)))
    : '',
  precio_venta_sugerido: detalle?.precio_venta_sugerido
    ? String(Math.round(Number(detalle.precio_venta_sugerido)))
    : '',
  precio_venta_actual: detalle?.precio_venta_sugerido
    ? String(Math.round(Number(detalle.precio_venta_sugerido)))
    : '',
  iva: detalle?.iva ? String(Math.round(Number(detalle.iva))) : defaultIva,
  iva_bloqueado: true,
  descuento: detalle?.descuento ? String(Math.round(Number(detalle.descuento))) : '0',
});

const ProcesarFacturaForm = ({
  onProcess,
  onAddDetails,
  onCancel,
  onCreateProduct,
  isLoading,
  isSavingDetails,
  error,
  detailsError,
}) => {
  const [query, setQuery] = useState('');
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
  const [preview, setPreview] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const [detailsDraft, setDetailsDraft] = useState([{ ...emptyDetail }]);
  const [detailsTouched, setDetailsTouched] = useState(false);
  const salePricingRules = useInventarioStore((state) => state.salePricingRules);

  const facturasQuery = useQuery({
    queryKey: ['inventario', 'facturas', { q: query }],
    queryFn: () => listarFacturasCompra({ q: query, estado: 'PENDIENTE' }),
  });

  const facturas = getResults(facturasQuery.data);
  const facturasConVencimiento = facturas.filter((factura) => factura.vencimiento_proximo);
  const selectedProductIds = detailsDraft
    .map((item) => String(item.producto || ''))
    .filter(Boolean);
  const hasDuplicateProducts =
    new Set(selectedProductIds).size !== selectedProductIds.length;
  const detallesInvalid =
    hasDuplicateProducts ||
    detailsDraft.some(
      (item) =>
        !item.producto ||
        Number(item.cantidad) <= 0 ||
        Number(item.precio_unitario) <= 0,
    );

  const selectFactura = (factura) => {
    setFacturaSeleccionada(factura);
    setPreview(false);
    setDetailsTouched(false);
    const detalles = factura.detalles || [];
    const defaultIva = resolveInvoiceIvaPercent(factura.iva, factura.subtotal);
    setDetailsDraft(
      detalles.length
        ? detalles.map((detalle) => toDetailDraft(detalle, defaultIva))
        : [newDetailWithIva(defaultIva)],
    );
    setEditingDetails(false);
  };

  const updateDetail = (index, patch) => {
    setDetailsDraft((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  };

  const addDetail = () => {
    const defaultIva = resolveInvoiceIvaPercent(
      facturaSeleccionada?.iva,
      facturaSeleccionada?.subtotal,
    );
    setDetailsDraft((prev) => [...prev, newDetailWithIva(defaultIva)]);
  };

  const removeDetail = (index) => {
    setDetailsDraft((prev) =>
      prev.length === 1
        ? [{ ...emptyDetail }]
        : prev.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  const handleSaveDetails = () => {
    if (!facturaSeleccionada || !onAddDetails) return;
    setDetailsTouched(true);
    if (detallesInvalid) return;

    onAddDetails(
      {
        id: facturaSeleccionada.id,
        detalles: detailsDraft.map((item) => ({
          producto: item.producto,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          precio_venta_sugerido: item.precio_venta_sugerido || null,
          iva: item.iva || '0',
          descuento: item.descuento || '0',
        })),
      },
      {
        onSuccess: (facturaActualizada) => {
          setFacturaSeleccionada(facturaActualizada);
          const defaultIva = resolveInvoiceIvaPercent(
            facturaActualizada.iva,
            facturaActualizada.subtotal,
          );
          setDetailsDraft(
            (facturaActualizada.detalles || []).map((detalle) =>
              toDetailDraft(detalle, defaultIva),
            ),
          );
          setEditingDetails(false);
          setDetailsTouched(false);
          setPreview(false);
        },
      },
    );
  };

  const handleProcess = () => {
    if (!facturaSeleccionada) return;
    onProcess({
      id: facturaSeleccionada.id,
      regla_precio_venta: {
        umbral: salePricingRules.threshold,
        margen_menor_igual: salePricingRules.markupBelowOrEqual,
        margen_mayor: salePricingRules.markupAbove,
      },
    });
  };

  const hasDetails = (facturaSeleccionada?.detalles || []).length > 0;
  const canProcess = hasDetails && preview && !editingDetails;

  if (editingDetails && facturaSeleccionada) {
    return (
      <DetailsModule
        factura={facturaSeleccionada}
        rows={detailsDraft}
        onUpdate={updateDetail}
        onAdd={addDetail}
        onRemove={removeDetail}
        onSave={handleSaveDetails}
        onBack={() => {
          setEditingDetails(false);
          setDetailsTouched(false);
        }}
        onCreateProduct={onCreateProduct}
        isSaving={isSavingDetails}
        touched={detailsTouched}
        invalid={detallesInvalid}
        duplicate={hasDuplicateProducts}
        salePricingRules={salePricingRules}
        error={detailsError}
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="surface p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="app-button-secondary min-h-10"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </button>
            <div className="space-y-2">
              <div className="section-chip">Procesamiento</div>
              <div className="text-sm font-semibold text-main">
                Procesar factura y actualizar inventario
              </div>
              <div className="text-[12px] text-soft">
                Selecciona la factura, agrega productos si faltan y confirma el ingreso.
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-[var(--accent-line)] bg-[var(--accent-soft)] p-3 text-[var(--accent)]">
            <FileSearch className="h-5 w-5" />
          </div>
        </div>
      </section>

      {(error || detailsError) && (
        <div className="rounded-xl border border-[rgba(159,47,45,0.18)] bg-[var(--danger-soft)] px-5 py-4 text-sm text-[var(--danger-text)]">
          {error || detailsError}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="surface p-5 sm:p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar numero de factura"
              className="app-input min-h-11 pl-10"
            />
          </div>

          <div className="mt-5 space-y-3">
            {facturasConVencimiento.length > 0 && (
              <div className="rounded-xl border border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)] px-4 py-3 text-[13px] text-[var(--warning-text)]">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4" />
                  <span>
                    {facturasConVencimiento.length} factura
                    {facturasConVencimiento.length !== 1 ? 's' : ''} de compra vence
                    {facturasConVencimiento.length !== 1 ? 'n' : ''} en 3 dias o menos.
                  </span>
                </div>
              </div>
            )}
            {facturasQuery.isLoading ? (
              <div className="flex items-center justify-center py-16 text-soft">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-muted" />
                Buscando facturas...
              </div>
            ) : facturas.length === 0 ? (
              <div className="empty-state min-h-[220px]">
                No hay facturas pendientes para esta busqueda.
              </div>
            ) : (
              facturas.map((factura) => (
                <button
                  key={factura.id}
                  type="button"
                  onClick={() => selectFactura(factura)}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    facturaSeleccionada?.id === factura.id
                      ? 'border-[var(--accent-line)] bg-[var(--accent-soft)]'
                      : 'border-app bg-white/66 hover:bg-white/88'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-main">
                        {factura.numero_factura}
                      </p>
                      <p className="mt-1 text-[13px] text-soft">
                        {factura.proveedor_nombre || 'Sin proveedor'} {' '}
                        {formatDate(factura.fecha_factura)}
                      </p>
                    </div>
                    <span className="inline-flex items-center rounded-full border border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--warning-text)]">
                      {factura.estado}
                    </span>
                  </div>
                  <p className="mt-3 font-display text-[1.8rem] leading-none text-main">
                    {formatCurrency(Number(factura.total || 0))}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-app bg-white/70 px-3 py-1 text-[11px] font-semibold text-soft">
                      {(factura.detalles || []).length} productos
                    </span>
                    {factura.vencimiento_proximo && (
                      <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)] px-3 py-1 text-[11px] font-semibold text-[var(--warning-text)]">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Vence pronto
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="surface p-5 sm:p-6">
          {!facturaSeleccionada ? (
            <div className="flex min-h-96 flex-col items-center justify-center text-center">
              <div className="rounded-lg border border-app bg-[var(--panel-soft)] p-4 text-soft">
                <FileSearch className="h-10 w-10" />
              </div>
              <p className="mt-4 text-sm font-semibold text-main">
                Selecciona una factura pendiente
              </p>
              <p className="mt-2 max-w-md text-[13px] text-soft">
                Aqui podras agregar productos y luego confirmar el ingreso al inventario.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-main">
                    Factura {facturaSeleccionada.numero_factura}
                  </div>
                  <p className="mt-2 text-[12px] text-soft">
                    {hasDetails
                      ? `${facturaSeleccionada.detalles.length} producto${facturaSeleccionada.detalles.length !== 1 ? 's' : ''} listo${facturaSeleccionada.detalles.length !== 1 ? 's' : ''} para procesar`
                      : 'Esta factura aun no tiene productos para inventario'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDetails(true);
                      setPreview(false);
                    }}
                    className="app-button-secondary min-h-11"
                  >
                    <PackagePlus className="h-4 w-4" />
                    {hasDetails ? 'Editar productos' : 'Agregar productos'}
                  </button>
                  <button
                    type="button"
                    onClick={onCreateProduct}
                    className="app-button-secondary min-h-11"
                  >
                    <PackagePlus className="h-4 w-4" />
                    Crear producto
                  </button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Summary
                  label="Subtotal"
                  value={formatCurrency(Number(facturaSeleccionada.subtotal || 0))}
                />
                <Summary
                  label="IVA"
                  value={formatCurrency(Number(facturaSeleccionada.iva || 0))}
                />
                <Summary
                  label="Total factura"
                  value={formatCurrency(Number(facturaSeleccionada.total || 0))}
                  strong
                />
              </div>

              <DetailsPreview
                detalles={facturaSeleccionada.detalles || []}
                salePricingRules={salePricingRules}
              />

              {preview ? (
                <div className="rounded-xl border border-[var(--accent-line)] bg-[var(--accent-soft)] p-5 text-[var(--accent)]">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5" />
                    <div>
                      <p className="text-sm font-semibold">Preview confirmado</p>
                      <p className="mt-1 text-[13px] leading-6">
                        Al procesar, el sistema actualizara stock, registrara movimientos y marcara la factura como procesada.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-3 border-t border-app pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setPreview(true)}
                  disabled={!hasDetails || editingDetails}
                  className="app-button-secondary min-h-11"
                >
                  Ver preview
                </button>
                <button
                  type="button"
                  onClick={handleProcess}
                  disabled={!canProcess || isLoading}
                  className="app-button-primary min-h-11"
                >
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirmar procesamiento
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

const DetailsModule = ({
  factura,
  rows,
  onUpdate,
  onAdd,
  onRemove,
  onSave,
  onBack,
  onCreateProduct,
  isSaving,
  touched,
  invalid,
  duplicate,
  salePricingRules,
  error,
}) => {
  const totalCompras = rows.reduce(
    (acc, item) =>
      acc + Number(item.cantidad || 0) * Number(item.precio_unitario || 0),
    0,
  );
  const subtotalFactura = Number(factura.subtotal || 0);
  const diferenciaCompras = totalCompras - subtotalFactura;
  const comprasCoinciden = Math.abs(diferenciaCompras) < 1;
  const defaultIva = resolveInvoiceIvaPercent(factura.iva, factura.subtotal);

  return (
    <div className="space-y-6">
    <section className="surface p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onBack}
            className="app-button-secondary min-h-10"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>
          <div className="space-y-2">
            <div className="section-chip">Productos para inventario</div>
            <div className="text-sm font-semibold text-main">
              Factura {factura.numero_factura}
            </div>
            <div className="max-w-2xl text-[12px] text-soft">
              Anexa productos fila por fila. Al guardar quedaran relacionados con la factura; el stock se actualiza cuando confirmes el procesamiento.
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onCreateProduct}
            className="app-button-secondary min-h-10"
          >
            <PackagePlus className="h-4 w-4" />
            Crear producto
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="app-button-primary min-h-10"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar productos
          </button>
        </div>
      </div>
    </section>

    {error && (
      <div className="rounded-xl border border-[rgba(159,47,45,0.18)] bg-[var(--danger-soft)] px-5 py-4 text-sm text-[var(--danger-text)]">
        {error}
      </div>
    )}

    <section className="grid gap-4 md:grid-cols-4">
      <Summary
        label="Subtotal factura"
        value={formatCurrency(subtotalFactura)}
      />
      <Summary
        label="Total compras"
        value={formatCurrency(totalCompras)}
        note={
          comprasCoinciden
            ? 'Coincide con subtotal'
            : `Diferencia ${formatCurrency(diferenciaCompras)}`
        }
        tone={comprasCoinciden ? 'ok' : 'warning'}
      />
      <Summary label="IVA" value={formatCurrency(Number(factura.iva || 0))} />
      <Summary
        label="Total factura"
        value={formatCurrency(Number(factura.total || 0))}
        strong
      />
    </section>

    <DetailsEditor
      rows={rows}
      onUpdate={onUpdate}
      onAdd={onAdd}
      onRemove={onRemove}
      onSave={onSave}
      isSaving={isSaving}
      touched={touched}
      invalid={invalid}
      duplicate={duplicate}
      salePricingRules={salePricingRules}
      defaultIva={defaultIva}
      embeddedSave={false}
    />
  </div>
  );
};

const DetailsEditor = ({
  rows,
  onUpdate,
  onAdd,
  onRemove,
  onSave,
  isSaving,
  touched,
  invalid,
  duplicate,
  salePricingRules,
  defaultIva = '0',
  embeddedSave = true,
}) => (
  <div className="rounded-xl border border-app bg-[var(--panel-soft)]">
    <div className="border-b border-app p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-main">Productos para inventario</p>
          <p className="mt-1 text-[12px] text-soft">
            Estos items solo actualizan precio y stock al procesar la factura.
          </p>
        </div>
        {embeddedSave && (
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="app-button-primary min-h-10"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar productos
          </button>
        )}
      </div>
      {touched && invalid && (
        <div className="mt-3 rounded-lg border border-[rgba(159,47,45,0.18)] bg-[var(--danger-soft)] px-4 py-3 text-[13px] text-[var(--danger-text)]">
          {duplicate
            ? 'No repitas el mismo producto dentro de la factura.'
            : 'Completa producto, cantidad y precio de compra en cada fila.'}
        </div>
      )}
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-[1120px] w-full table-fixed border-collapse text-left">
        <colgroup>
          <col className="w-[30%]" />
          <col className="w-[8%]" />
          <col className="w-[14%]" />
          <col className="w-[16%]" />
          <col className="w-[7%]" />
          <col className="w-[14%]" />
          <col className="w-[7%]" />
        </colgroup>
        <thead>
          <tr className="border-b border-app bg-[var(--panel-soft)]">
            {['Producto', 'Cant.', 'Compra', 'Venta', 'IVA', 'Subtotal', ''].map((heading) => (
              <th
                key={heading}
                scope="col"
                className="border-r border-app px-3 py-3 last:border-r-0"
              >
                <span className="eyebrow">{heading}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((item, index) => {
            const costoFinal =
              Number(item.precio_unitario || 0) * (1 + Number(item.iva || 0) / 100);
            const subtotalLinea =
              Number(item.cantidad || 0) *
              Number(item.precio_unitario || 0) *
              (1 + Number(item.iva || 0) / 100);
            const ventaSugerida = calculateSuggestedSalePrice(
              costoFinal,
              salePricingRules,
            );
            return (
              <tr
                key={`${index}-${item.producto}`}
                className="border-b border-app last:border-b-0"
              >
                <td className="border-r border-app p-2 align-top">
                  <ProductLookupField
                    value={item.producto}
                    selectedName={item.producto_nombre}
                    excludedIds={rows
                      .filter((_, itemIndex) => itemIndex !== index)
                      .map((detalle) => String(detalle.producto || ''))
                      .filter(Boolean)}
                    onSelect={(producto) =>
                      onUpdate(index, {
                        producto: producto?.id ? String(producto.id) : '',
                        producto_nombre: producto?.nombre || '',
                        precio_unitario: producto?.precio_compra
                          ? String(Math.round(Number(producto.precio_compra)))
                          : '',
                        precio_unitario_actual: producto?.precio_compra
                          ? String(Math.round(Number(producto.precio_compra)))
                          : '',
                        precio_venta_sugerido: '',
                        precio_venta_actual: producto?.precio_venta
                          ? String(Math.round(Number(producto.precio_venta)))
                          : '',
                        iva: item.iva_bloqueado
                          ? defaultIva
                          : producto?.iva
                            ? String(Math.round(Number(producto.iva)))
                            : '0',
                      })
                    }
                    compact
                  />
                </td>
                <td className="border-r border-app p-2 align-top">
                  <ItemInput
                    label="Cant."
                    value={item.cantidad}
                    onChange={(value) => onUpdate(index, { cantidad: value })}
                    integerOnly
                    compact
                  />
                </td>
                <td className="border-r border-app p-2 align-top">
                  <ItemInput
                    label="Compra"
                    value={item.precio_unitario}
                    onChange={(value) => onUpdate(index, { precio_unitario: value })}
                    helperValue={item.precio_unitario_actual}
                    compact
                  />
                </td>
                <td className="border-r border-app p-2 align-top">
                  <ItemInput
                    label="Venta"
                    value={item.precio_venta_sugerido}
                    onChange={(value) => onUpdate(index, { precio_venta_sugerido: value })}
                    helperValue={item.precio_venta_actual}
                    suggestedValue={ventaSugerida}
                    onApplySuggested={() =>
                      onUpdate(index, {
                        precio_venta_sugerido: roundCurrencyInput(ventaSugerida),
                      })
                    }
                    compact
                  />
                </td>
                <td className="border-r border-app p-2 align-top">
                  <ItemInput
                    label="IVA"
                    value={item.iva}
                    onChange={(value) => onUpdate(index, { iva: value })}
                    integerOnly
                    disabled={item.iva_bloqueado}
                    action={
                      <button
                        type="button"
                        onClick={() =>
                          onUpdate(index, {
                            iva_bloqueado: !item.iva_bloqueado,
                            iva: item.iva_bloqueado ? item.iva : defaultIva,
                          })
                        }
                        className="mt-1 inline-flex min-h-8 w-full items-center justify-center rounded-md border border-app text-soft transition hover:bg-white/70"
                        title={item.iva_bloqueado ? 'Desbloquear IVA' : 'Bloquear IVA'}
                      >
                        {item.iva_bloqueado ? (
                          <Lock className="h-3.5 w-3.5" />
                        ) : (
                          <Unlock className="h-3.5 w-3.5" />
                        )}
                      </button>
                    }
                    compact
                  />
                </td>
                <td className="border-r border-app p-2 align-top">
                  <div className="min-h-11 rounded-md border border-app bg-[var(--panel)] px-3 py-3 text-sm font-semibold text-main">
                    {formatCurrency(subtotalLinea)}
                  </div>
                </td>
                <td className="p-2 align-top">
                  <button
                    type="button"
                    onClick={() => onRemove(index)}
                    disabled={rows.length === 1}
                    className="min-h-10 w-full rounded-md border border-[rgba(159,47,45,0.18)] bg-[var(--danger-soft)] text-[var(--danger-text)] transition disabled:opacity-40"
                    aria-label="Eliminar fila"
                  >
                    <Trash2 className="mx-auto h-4 w-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    <div className="border-t border-app p-4">
      <button
        type="button"
        onClick={onAdd}
        className="app-button-secondary min-h-10"
      >
        <Plus className="h-4 w-4" />
        Agregar fila
      </button>
    </div>
  </div>
);

const DetailsPreview = ({ detalles, salePricingRules }) => {
  if (!detalles.length) {
    return (
      <div className="rounded-xl border border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)] p-5 text-[var(--warning-text)]">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5" />
          <div>
            <p className="text-sm font-semibold">Faltan productos</p>
            <p className="mt-1 text-[13px] leading-6">
              Usa "Agregar productos" para relacionar los items de esta factura antes de procesarla.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {detalles.map((detalle) => {
        const costoFinal =
          Number(detalle.precio_unitario || 0) *
          (1 + Number(detalle.iva || 0) / 100);
        const precioSugerido = calculateSuggestedSalePrice(
          costoFinal,
          salePricingRules,
        );
        return (
          <div
            key={detalle.id}
            className="rounded-xl border border-app bg-white/70 p-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-main">
                  {detalle.producto_nombre || `Producto #${detalle.producto}`}
                </h3>
                <p className="mt-1 text-[13px] text-soft">
                  Cantidad {Number(detalle.cantidad || 0)} | IVA{' '}
                  {Number(detalle.iva || 0).toFixed(2)}%
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-sm font-semibold text-main">
                  {formatCurrency(costoFinal)}
                </p>
                <p className="mt-1 text-[13px] text-[var(--accent)]">
                  {detalle.precio_venta_sugerido
                    ? `Venta definida ${formatCurrency(detalle.precio_venta_sugerido)}`
                    : `Sugerido venta ${formatCurrency(precioSugerido)}`}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const ProductLookupField = ({
  value,
  selectedName,
  excludedIds = [],
  onSelect,
  compact = false,
}) => {
  const [query, setQuery] = useState(selectedName || '');
  const deferredQuery = useDeferredValue(query.trim());

  useEffect(() => {
    if (selectedName && selectedName !== query) {
      setQuery(selectedName);
    }
  }, [selectedName, query]);

  const productosQuery = useQuery({
    queryKey: ['inventario', 'productos', 'factura-detalle-busqueda', deferredQuery],
    queryFn: () => buscarProductos(deferredQuery),
    enabled: deferredQuery.length >= 2,
  });

  const results = (productosQuery.data?.results || productosQuery.data || [])
    .filter((producto) => !excludedIds.includes(String(producto.id)))
    .slice(0, 6);

  return (
    <label className="app-field">
      {!compact && <span className="app-field-label">Producto</span>}
      <input
        type="text"
        value={query}
        onChange={(event) => {
          const nextValue = event.target.value;
          setQuery(nextValue);
          if (value && nextValue !== selectedName) {
            onSelect(null);
          }
        }}
        placeholder="Busca por nombre o codigo"
        className="app-input min-h-11"
        aria-label={compact ? 'Producto' : undefined}
      />
      {deferredQuery.length >= 2 && !value && (
        <div className="mt-3 space-y-3">
          {productosQuery.isFetching && (
            <div className="inline-flex items-center gap-2 text-[13px] text-soft">
              <Loader2 className="h-4 w-4 animate-spin" />
              Buscando productos...
            </div>
          )}
          {!productosQuery.isFetching && results.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {results.map((producto) => (
                <button
                  key={producto.id}
                  type="button"
                  onClick={() => {
                    onSelect(producto);
                    setQuery(producto.nombre);
                  }}
                  className={`rounded-full border px-3 py-2 text-[12px] transition ${
                    String(value) === String(producto.id)
                      ? 'border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]'
                      : 'border-app bg-white/72 text-main hover:bg-white'
                  }`}
                >
                  {producto.nombre}
                </button>
              ))}
            </div>
          )}
          {!productosQuery.isFetching && results.length === 0 && (
            <div className="text-[12px] text-soft">
              Sin coincidencias para esta busqueda.
            </div>
          )}
        </div>
      )}
    </label>
  );
};

const ItemInput = ({
  label,
  value,
  onChange,
  integerOnly = false,
  helperValue = '',
  suggestedValue = null,
  onApplySuggested = null,
  compact = false,
  disabled = false,
  action = null,
}) => (
  <label className="app-field">
    {!compact && <span className="app-field-label">{label}</span>}
    <input
      type="number"
      min="0"
      step={integerOnly ? '1' : '0.01'}
      value={value}
      disabled={disabled}
      onFocus={(event) => {
        if (disabled) return;
        if (String(value) === '1' || String(value) === '0') {
          onChange('');
          return;
        }
        event.target.select();
      }}
      onBlur={(event) => {
        if (event.target.value === '') {
          return;
        }
        if (integerOnly) {
          onChange(String(Math.round(Number(event.target.value) || 0)));
        }
      }}
      onChange={(event) => onChange(event.target.value)}
      className="app-input min-h-11 disabled:cursor-not-allowed disabled:opacity-70"
      aria-label={compact ? label : undefined}
    />
    {action}
    {Number(suggestedValue) > 0 && typeof onApplySuggested === 'function' && (
      <button
        type="button"
        onClick={onApplySuggested}
        className={`${compact ? 'mt-1' : 'mt-2'} inline-flex w-fit items-center rounded-full border border-[var(--accent-line)] bg-[var(--accent-soft)] px-2 py-1 text-[10px] font-semibold text-[var(--accent)] transition hover:bg-white`}
      >
        Sugerido {formatCurrency(suggestedValue)}
      </button>
    )}
    {helperValue !== '' && helperValue !== null && helperValue !== undefined && (
      <div className="mt-1 text-[10px] text-soft">
        Actual: <span className="font-semibold text-main">{formatCurrency(helperValue)}</span>
      </div>
    )}
  </label>
);

const Summary = ({ label, value, strong = false, note = '', tone = 'neutral' }) => (
  <div
    className={`rounded-xl border p-4 ${
      strong
        ? 'border-sky-500/45 bg-slate-950 text-white shadow-[0_0_0_1px_rgba(14,165,233,0.15)]'
        : 'border-app bg-white/74 text-main'
    }`}
  >
    <p className={`text-[10px] font-semibold uppercase tracking-[0.24em] ${strong ? 'text-sky-100' : 'text-muted'}`}>
      {label}
    </p>
    <p className={`mt-2 font-display text-[1.7rem] leading-none ${strong ? 'text-white' : ''}`}>
      {value}
    </p>
    {note && (
      <p
        className={`mt-2 text-[11px] font-semibold ${
          tone === 'ok'
            ? 'text-[var(--success-text)]'
            : tone === 'warning'
              ? 'text-[var(--warning-text)]'
              : strong
                ? 'text-sky-100'
                : 'text-soft'
        }`}
      >
        {note}
      </p>
    )}
  </div>
);

export default ProcesarFacturaForm;

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle2,
  FileSearch,
  Loader2,
  PackagePlus,
  Search,
} from 'lucide-react';
import { listarFacturasCompra } from '../../services/inventario.service';
import { useInventarioStore } from '../../store/useInventarioStore';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  calculateSuggestedSalePrice,
} from '../../utils/inventarioPricing';

const getResults = (data) => data?.results || data || [];

const ProcesarFacturaForm = ({
  onProcess,
  onCancel,
  onCreateProduct,
  isLoading,
  error,
}) => {
  const [query, setQuery] = useState('');
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
  const [preview, setPreview] = useState(false);
  const salePricingRules = useInventarioStore((state) => state.salePricingRules);

  const facturasQuery = useQuery({
    queryKey: ['inventario', 'facturas', { q: query }],
    queryFn: () => listarFacturasCompra({ q: query, estado: 'PENDIENTE' }),
  });

  const facturas = getResults(facturasQuery.data);

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

  return (
    <div className="space-y-6">
      <section className="surface p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={onCancel}
              className="app-button-secondary min-h-11"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </button>
            <div>
              <div className="eyebrow">Procesamiento</div>
              <h1 className="section-title mt-2">
                Procesar factura y actualizar inventario
              </h1>
              <p className="body-copy mt-2">
                Busca facturas pendientes, revisa el costo y confirma el ingreso
                con una lectura mucho mas limpia.
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-[var(--accent-line)] bg-[var(--accent-soft)] p-3 text-[var(--accent)]">
            <FileSearch className="h-5 w-5" />
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-[rgba(159,47,45,0.18)] bg-[var(--danger-soft)] px-5 py-4 text-sm text-[var(--danger-text)]">
          {error}
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
                  onClick={() => {
                    setFacturaSeleccionada(factura);
                    setPreview(false);
                  }}
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
                        {factura.proveedor_nombre || 'Sin proveedor'} ·{' '}
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
                Aqui veras el preview antes de confirmar el ingreso al inventario.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="section-title">
                    Factura {facturaSeleccionada.numero_factura}
                  </h2>
                  <p className="body-copy mt-2">
                    {facturaSeleccionada.detalles?.length || 0} producto
                    {facturaSeleccionada.detalles?.length !== 1 ? 's' : ''} listo
                    {facturaSeleccionada.detalles?.length !== 1 ? 's' : ''} para
                    procesar
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onCreateProduct}
                  className="app-button-secondary min-h-11"
                >
                  <PackagePlus className="h-4 w-4" />
                  Crear producto
                </button>
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
                  label="Total"
                  value={formatCurrency(Number(facturaSeleccionada.total || 0))}
                  strong
                />
              </div>

              <div className="rounded-xl border border-app bg-[var(--panel-soft)] p-4">
                <p className="eyebrow">Regla sugerido venta</p>
                <p className="mt-2 text-[13px] text-soft">
                  Esta factura usa la regla global configurada en el modulo de inventario:
                  menor o igual a {formatCurrency(salePricingRules.threshold)} suma
                  {' '}+{salePricingRules.markupBelowOrEqual}% y por encima suma
                  {' '}+{salePricingRules.markupAbove}%.
                </p>
              </div>

              <div className="space-y-3">
                {(facturaSeleccionada.detalles || []).map((detalle) => {
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
                            Cantidad {Number(detalle.cantidad || 0)} · IVA{' '}
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

              {preview ? (
                <div className="rounded-xl border border-[var(--accent-line)] bg-[var(--accent-soft)] p-5 text-[var(--accent)]">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5" />
                    <div>
                      <p className="text-sm font-semibold">Preview confirmado</p>
                      <p className="mt-1 text-[13px] leading-6">
                        Al procesar, el backend actualizara stock, registrara
                        movimientos y marcara la factura como procesada.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-3 border-t border-app pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setPreview(true)}
                  className="app-button-secondary min-h-11"
                >
                  Ver preview
                </button>
                <button
                  type="button"
                  onClick={handleProcess}
                  disabled={!preview || isLoading}
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

const Summary = ({ label, value, strong = false }) => (
  <div
    className={`rounded-xl border p-4 ${
      strong
        ? 'border-[var(--text-main)] bg-[var(--text-main)] text-white'
        : 'border-app bg-white/74 text-main'
    }`}
  >
    <p className={`text-[10px] font-semibold uppercase tracking-[0.24em] ${strong ? 'text-white/72' : 'text-muted'}`}>
      {label}
    </p>
    <p className="mt-2 font-display text-[1.7rem] leading-none">{value}</p>
  </div>
);

export default ProcesarFacturaForm;

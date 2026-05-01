import { useDeferredValue, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FilePlus2, Loader2, Plus, Trash2 } from 'lucide-react';
import { buscarProductos } from '../../services/inventario.service';
import { buscarProveedores } from '../../services/proveedores.service';
import { useInventarioStore } from '../../store/useInventarioStore';
import { formatCurrency } from '../../utils/formatters';
import {
  calculateSuggestedSalePrice,
  roundCurrencyInput,
} from '../../utils/inventarioPricing';

const emptyItem = {
  producto: '',
  producto_nombre: '',
  cantidad: '1',
  precio_unitario: '',
  precio_unitario_actual: '',
  precio_venta_sugerido: '',
  precio_venta_actual: '',
  iva: '0',
  descuento: '0',
};

const FacturaCompraForm = ({ onSubmit, onCancel, isLoading, error }) => {
  const [formData, setFormData] = useState({
    numero_factura: '',
    proveedor: '',
    fecha_factura: new Date().toISOString().slice(0, 10),
    descuento: '0',
    transporte_global: '0',
    observaciones: '',
    detalles: [{ ...emptyItem }],
  });
  const [providerQuery, setProviderQuery] = useState('');
  const [touched, setTouched] = useState(false);
  const deferredProviderQuery = useDeferredValue(providerQuery.trim());
  const salePricingRules = useInventarioStore((state) => state.salePricingRules);

  const proveedoresQuery = useQuery({
    queryKey: ['inventario', 'factura-proveedores', deferredProviderQuery],
    queryFn: () =>
      buscarProveedores(deferredProviderQuery, {
        page_size: 8,
        ordering: 'razon_social',
      }),
    enabled: deferredProviderQuery.length >= 2,
  });

  const proveedores = proveedoresQuery.data?.results || [];
  const selectedProductIds = formData.detalles
    .map((item) => String(item.producto || ''))
    .filter(Boolean);
  const hasDuplicateProducts =
    new Set(selectedProductIds).size !== selectedProductIds.length;
  const subtotal = formData.detalles.reduce(
    (acc, item) =>
      acc + Number(item.cantidad || 0) * Number(item.precio_unitario || 0),
    0,
  );
  const ivaTotal = formData.detalles.reduce(
    (acc, item) =>
      acc +
      Number(item.cantidad || 0) *
        Number(item.precio_unitario || 0) *
        (Number(item.iva || 0) / 100),
    0,
  );
  const transportePorcentaje = Number(formData.transporte_global || 0);
  const transporte = subtotal * (transportePorcentaje / 100);
  const total = subtotal + ivaTotal + transporte - Number(formData.descuento || 0);

  const updateItem = (index, patch) => {
    setFormData((prev) => ({
      ...prev,
      detalles: prev.detalles.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  };

  const addItem = () =>
    setFormData((prev) => ({
      ...prev,
      detalles: [...prev.detalles, { ...emptyItem }],
    }));

  const removeItem = (index) =>
    setFormData((prev) => ({
      ...prev,
      detalles: prev.detalles.filter((_, itemIndex) => itemIndex !== index),
    }));

  const invalid =
    !formData.numero_factura.trim() ||
    !formData.fecha_factura ||
    hasDuplicateProducts ||
    formData.detalles.some(
      (item) =>
        !item.producto ||
        Number(item.cantidad) <= 0 ||
        Number(item.precio_unitario) <= 0,
    );

  const handleSubmit = (event) => {
    event.preventDefault();
    setTouched(true);
    if (invalid) return;
    onSubmit({
      numero_factura: formData.numero_factura.trim(),
      proveedor: formData.proveedor || null,
      fecha_factura: formData.fecha_factura,
      descuento: formData.descuento || '0',
      observaciones: formData.observaciones.trim(),
      detalles: formData.detalles.map((item) => ({
        producto: item.producto,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        precio_venta_sugerido: item.precio_venta_sugerido || null,
        iva: item.iva || '0',
        descuento: item.descuento || '0',
      })),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
              <div className="eyebrow">Compras</div>
              <h1 className="section-title mt-2">Registrar factura de compra</h1>
              <p className="body-copy mt-2">
                Carga encabezado y detalle con una lectura clara del costo antes
                de registrar la entrada.
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-[var(--accent-line)] bg-[var(--accent-soft)] p-3 text-[var(--accent)]">
            <FilePlus2 className="h-5 w-5" />
          </div>
        </div>
      </section>

      {(error || (touched && invalid)) && (
        <div className="rounded-xl border border-[rgba(159,47,45,0.18)] bg-[var(--danger-soft)] px-5 py-4 text-sm text-[var(--danger-text)]">
          {error ||
            (hasDuplicateProducts
              ? 'No repitas el mismo producto dentro de la factura.'
              : 'Completa numero, fecha y al menos un detalle valido.')}
        </div>
      )}

      <section className="surface p-5 sm:p-6">
        <div className="grid gap-5 md:grid-cols-3">
          <Field
            label="Numero factura"
            value={formData.numero_factura}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, numero_factura: value }))
            }
          />
          <label className="app-field">
            <span className="app-field-label">Proveedor</span>
            <input
              type="text"
              value={providerQuery}
              onChange={(event) => {
                setProviderQuery(event.target.value);
                setFormData((prev) => ({ ...prev, proveedor: '' }));
              }}
              placeholder="Busca por nombre del proveedor"
              className="app-input min-h-11"
            />
            {deferredProviderQuery.length >= 2 && !formData.proveedor && (
              <div className="mt-3 space-y-3">
                {proveedoresQuery.isFetching && (
                  <div className="inline-flex items-center gap-2 text-[13px] text-soft">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Buscando proveedores...
                  </div>
                )}
                {!proveedoresQuery.isFetching && proveedores.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {proveedores.map((proveedor) => (
                      <button
                        key={proveedor.id}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            proveedor: String(proveedor.id),
                          }));
                          setProviderQuery(
                            proveedor.nombre_completo ||
                              proveedor.razon_social ||
                              '',
                          );
                        }}
                        className={`rounded-full border px-3 py-2 text-[12px] transition ${
                          String(formData.proveedor) === String(proveedor.id)
                            ? 'border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]'
                            : 'border-app bg-white/72 text-main hover:bg-white'
                        }`}
                      >
                        {proveedor.nombre_completo || proveedor.razon_social}
                      </button>
                    ))}
                  </div>
                )}
                {!proveedoresQuery.isFetching && proveedores.length === 0 && (
                  <div className="text-[12px] text-soft">
                    Sin coincidencias para esta busqueda.
                  </div>
                )}
              </div>
            )}
          </label>
          <Field
            label="Fecha factura"
            type="date"
            value={formData.fecha_factura}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, fecha_factura: value }))
            }
          />
          <Field
            label="Descuento factura"
            type="number"
            min="0"
            step="1"
            clearOnFocus
            integerOnly
            value={formData.descuento}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, descuento: value }))
            }
          />
          <Field
            label="Transporte global (%)"
            type="number"
            min="0"
            step="1"
            clearOnFocus
            integerOnly
            value={formData.transporte_global}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, transporte_global: value }))
            }
          />
          <label className="app-field md:col-span-3">
            <span className="app-field-label">Observaciones</span>
            <input
              id="observaciones_factura"
              value={formData.observaciones}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  observaciones: event.target.value,
                }))
              }
              className="app-input min-h-11"
            />
          </label>
        </div>
      </section>

      <section className="surface overflow-hidden">
        <div className="border-b border-app p-5">
          <div>
            <h2 className="section-title">Productos de la factura</h2>
            <p className="body-copy mt-1">
              El transporte se calcula al final como porcentaje global de la factura.
            </p>
          </div>
        </div>
        <div className="divide-y divide-[var(--line)]">
          {formData.detalles.map((item, index) => {
            const transportePorLinea =
              Number(item.precio_unitario || 0) * (transportePorcentaje / 100);
            const costoFinal =
              Number(item.precio_unitario || 0) *
                (1 + Number(item.iva || 0) / 100) +
              transportePorLinea;
            const ventaSugerida = calculateSuggestedSalePrice(
              costoFinal,
              salePricingRules,
            );
            return (
              <div
                key={`${index}-${item.producto}`}
                className="grid gap-3 p-5 lg:grid-cols-[1.45fr_90px_130px_130px_90px_130px_44px]"
              >
                <ProductLookupField
                  value={item.producto}
                  selectedName={item.producto_nombre}
                  excludedIds={formData.detalles
                    .filter((_, itemIndex) => itemIndex !== index)
                    .map((detalle) => String(detalle.producto || ''))
                    .filter(Boolean)}
                  onSelect={(producto) =>
                    updateItem(index, {
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
                      iva: producto?.iva
                        ? String(Math.round(Number(producto.iva)))
                        : '0',
                    })
                  }
                />
                <ItemInput
                  label="Cant."
                  value={item.cantidad}
                  onChange={(value) => updateItem(index, { cantidad: value })}
                  integerOnly
                />
                <ItemInput
                  label="Compra"
                  value={item.precio_unitario}
                  onChange={(value) =>
                    updateItem(index, { precio_unitario: value })
                  }
                  helperValue={item.precio_unitario_actual}
                />
                <ItemInput
                  label="Venta"
                  value={item.precio_venta_sugerido}
                  onChange={(value) =>
                    updateItem(index, { precio_venta_sugerido: value })
                  }
                  helperValue={item.precio_venta_actual}
                  suggestedValue={ventaSugerida}
                  onApplySuggested={() =>
                    updateItem(index, {
                      precio_venta_sugerido: roundCurrencyInput(ventaSugerida),
                    })
                  }
                />
                <ItemInput
                  label="IVA"
                  value={item.iva}
                  onChange={(value) => updateItem(index, { iva: value })}
                  integerOnly
                />
                <div className="rounded-xl border border-app bg-[var(--panel-soft)] px-3 py-3">
                  <p className="eyebrow">Costo final</p>
                  <p className="mt-2 text-sm font-semibold text-main">
                    {formatCurrency(costoFinal)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  disabled={formData.detalles.length === 1}
                  className="mt-6 min-h-11 rounded-md border border-[rgba(159,47,45,0.18)] bg-[var(--danger-soft)] text-[var(--danger-text)] transition disabled:opacity-40"
                >
                  <Trash2 className="mx-auto h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
        <div className="border-t border-app p-5">
          <button
            type="button"
            onClick={addItem}
            className="app-button-primary ml-auto min-h-10"
          >
            <Plus className="h-4 w-4" />
            Agregar
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Summary label="Subtotal" value={formatCurrency(subtotal)} />
        <Summary label="IVA" value={formatCurrency(ivaTotal)} />
        <Summary label="Transporte" value={formatCurrency(transporte)} />
        <Summary label="Total preview" value={formatCurrency(total)} strong />
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="app-button-secondary min-h-11"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="app-button-primary min-h-11"
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          Registrar factura
        </button>
      </div>
    </form>
  );
};

const Field = ({
  label,
  value,
  onChange,
  type = 'text',
  clearOnFocus = false,
  integerOnly = false,
  ...props
}) => (
  <label className="app-field">
    <span className="app-field-label">{label}</span>
    <input
      type={type}
      value={value}
      onFocus={(event) => {
        if (clearOnFocus && (String(value) === '0' || String(value) === '0.00')) {
          onChange('');
          return;
        }
        if (clearOnFocus) {
          event.target.select();
        }
      }}
      onBlur={(event) => {
        if (!integerOnly || event.target.value === '') {
          return;
        }
        onChange(String(Math.round(Number(event.target.value) || 0)));
      }}
      onChange={(event) => onChange(event.target.value)}
      className="app-input min-h-11"
      {...props}
    />
  </label>
);

const ProductLookupField = ({
  value,
  selectedName,
  excludedIds = [],
  onSelect,
}) => {
  const [query, setQuery] = useState(selectedName || '');
  const deferredQuery = useDeferredValue(query.trim());

  useEffect(() => {
    if (selectedName && selectedName !== query) {
      setQuery(selectedName);
    }
  }, [selectedName]);

  const productosQuery = useQuery({
    queryKey: ['inventario', 'productos', 'factura-busqueda', deferredQuery],
    queryFn: () => buscarProductos(deferredQuery),
    enabled: deferredQuery.length >= 2,
  });

  const results = (productosQuery.data?.results || productosQuery.data || [])
    .filter((producto) => !excludedIds.includes(String(producto.id)))
    .slice(0, 6);

  return (
    <label className="app-field">
      <span className="app-field-label">Producto</span>
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
}) => (
  <label className="app-field">
    <span className="app-field-label">{label}</span>
    <input
      type="number"
      min="0"
      step={integerOnly ? '1' : '0.01'}
      value={value}
      onFocus={(event) => {
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
      className="app-input min-h-11"
    />
    {Number(suggestedValue) > 0 && typeof onApplySuggested === 'function' && (
      <button
        type="button"
        onClick={onApplySuggested}
        className="mt-2 inline-flex w-fit items-center rounded-full border border-[var(--accent-line)] bg-[var(--accent-soft)] px-3 py-1 text-[11px] font-semibold text-[var(--accent)] transition hover:bg-white"
      >
        Sugerido {formatCurrency(suggestedValue)}
      </button>
    )}
    {helperValue !== '' && helperValue !== null && helperValue !== undefined && (
      <div className="mt-1 text-[11px] text-soft">
        Actual: <span className="font-semibold text-main">{formatCurrency(helperValue)}</span>
      </div>
    )}
  </label>
);

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

export default FacturaCompraForm;

import { useDeferredValue, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Check,
  CreditCard,
  FilePlus2,
  Lock,
  Loader2,
  PackagePlus,
  Plus,
  Trash2,
  Unlock,
} from 'lucide-react';
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
  iva_bloqueado: true,
  descuento: '0',
};

const toMoney = (value) => Number(value || 0);
const roundPercentInput = (value) => String(Math.round(Number(value || 0)));
const resolveInvoiceIvaPercent = (ivaValue, subtotalValue) => {
  const iva = Number(ivaValue || 0);
  const subtotal = Number(subtotalValue || 0);
  if (!Number.isFinite(iva) || iva <= 0) return '0';
  if (iva <= 100) return roundPercentInput(iva);
  if (subtotal > 0) return roundPercentInput((iva / subtotal) * 100);
  return '0';
};

const FacturaCompraForm = ({ onSubmit, onCancel, isLoading, error }) => {
  const [formData, setFormData] = useState({
    numero_factura: '',
    proveedor: '',
    fecha_factura: new Date().toISOString().slice(0, 10),
    fecha_vencimiento: '',
    forma_pago: 'CONTADO',
    metodo_pago: 'EFECTIVO',
    descuento: '0',
    transporte_global: '0',
    subtotal_manual: '',
    iva_manual: '',
    total_manual: '',
    observaciones: '',
    detalles: [{ ...emptyItem }],
  });
  const [providerQuery, setProviderQuery] = useState('');
  const [incluirProductos, setIncluirProductos] = useState(false);
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
  const selectedProductIds = incluirProductos
    ? formData.detalles
        .map((item) => String(item.producto || ''))
        .filter(Boolean)
    : [];
  const hasDuplicateProducts =
    new Set(selectedProductIds).size !== selectedProductIds.length;

  const subtotalProductos = incluirProductos
    ? formData.detalles.reduce(
        (acc, item) =>
          acc + toMoney(item.cantidad) * toMoney(item.precio_unitario),
        0,
      )
    : 0;
  const ivaProductos = incluirProductos
    ? formData.detalles.reduce(
        (acc, item) =>
          acc +
          toMoney(item.cantidad) *
            toMoney(item.precio_unitario) *
            (toMoney(item.iva) / 100),
        0,
      )
    : 0;
  const transportePorcentaje = toMoney(formData.transporte_global);
  const transporte = incluirProductos
    ? subtotalProductos * (transportePorcentaje / 100)
    : 0;

  const subtotal = incluirProductos
    ? subtotalProductos
    : toMoney(formData.subtotal_manual);
  const ivaTotal = incluirProductos ? ivaProductos : toMoney(formData.iva_manual);
  const total = incluirProductos
    ? subtotal + ivaTotal + transporte - toMoney(formData.descuento)
    : toMoney(formData.total_manual);
  const saldoInicial =
    formData.forma_pago === 'CONTADO' ? 0 : Math.max(total, 0);
  const ivaFacturaPorcentaje = resolveInvoiceIvaPercent(
    formData.iva_manual,
    formData.subtotal_manual,
  );

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
      detalles: [
        ...prev.detalles,
        {
          ...emptyItem,
          iva: resolveInvoiceIvaPercent(prev.iva_manual, prev.subtotal_manual),
        },
      ],
    }));

  const removeItem = (index) =>
    setFormData((prev) => ({
      ...prev,
      detalles:
        prev.detalles.length === 1
          ? [{ ...emptyItem }]
          : prev.detalles.filter((_, itemIndex) => itemIndex !== index),
    }));

  const handleToggleProductos = (checked) => {
    setIncluirProductos(checked);
    if (!checked) return;
    setFormData((prev) => {
      const defaultIva = resolveInvoiceIvaPercent(
        prev.iva_manual,
        prev.subtotal_manual,
      );
      return {
        ...prev,
        detalles: prev.detalles.map((item) =>
          item.iva_bloqueado
            ? { ...item, iva: defaultIva, iva_bloqueado: true }
            : item,
        ),
      };
    });
  };

  const productDetailsInvalid =
    incluirProductos &&
    formData.detalles.some(
      (item) =>
        !item.producto ||
        Number(item.cantidad) <= 0 ||
        Number(item.precio_unitario) <= 0,
    );

  const manualTotalsInvalid =
    !incluirProductos &&
    (Number(formData.total_manual) <= 0 ||
      Number(formData.subtotal_manual || 0) < 0 ||
      Number(formData.iva_manual || 0) < 0);

  const vencimientoInvalid =
    formData.fecha_vencimiento &&
    formData.fecha_factura &&
    formData.fecha_vencimiento < formData.fecha_factura;

  const invalid =
    !formData.numero_factura.trim() ||
    !formData.fecha_factura ||
    total <= 0 ||
    hasDuplicateProducts ||
    productDetailsInvalid ||
    manualTotalsInvalid ||
    vencimientoInvalid;

  const handleSubmit = (event) => {
    event.preventDefault();
    setTouched(true);
    if (invalid) return;

    const payload = {
      numero_factura: formData.numero_factura.trim(),
      proveedor: formData.proveedor || null,
      fecha_factura: formData.fecha_factura,
      fecha_vencimiento: formData.fecha_vencimiento || null,
      forma_pago: formData.forma_pago,
      metodo_pago: formData.metodo_pago,
      descuento: formData.descuento || '0',
      subtotal: String(Math.max(subtotal, 0)),
      iva: String(Math.max(ivaTotal, 0)),
      total: String(Math.max(total, 0)),
      observaciones: formData.observaciones.trim(),
    };

    if (incluirProductos) {
      payload.detalles = formData.detalles.map((item) => ({
        producto: item.producto,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        precio_venta_sugerido: item.precio_venta_sugerido || null,
        iva: item.iva || '0',
        descuento: item.descuento || '0',
      }));
    }

    onSubmit(payload);
  };

  const validationMessage = () => {
    if (hasDuplicateProducts) return 'No repitas el mismo producto dentro de la factura.';
    if (vencimientoInvalid) return 'La fecha de vencimiento no puede ser anterior a la fecha de factura.';
    if (incluirProductos) return 'Completa numero, fecha y productos validos.';
    return 'Completa numero, fecha y total de la factura.';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
              <div className="section-chip">Compras</div>
              <div className="text-sm font-semibold text-main">
                Registrar factura de compra
              </div>
              <div className="text-[12px] text-soft">
                Registra primero el documento y sus pagos; agrega productos solo si vas a actualizar stock.
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-[var(--accent-line)] bg-[var(--accent-soft)] p-3 text-[var(--accent)]">
            <FilePlus2 className="h-5 w-5" />
          </div>
        </div>
      </section>

      {(error || (touched && invalid)) && (
        <div className="rounded-xl border border-[rgba(159,47,45,0.18)] bg-[var(--danger-soft)] px-5 py-4 text-sm text-[var(--danger-text)]">
          {error || validationMessage()}
        </div>
      )}

      <section className="surface p-5 sm:p-6">
        <SectionHeader
          icon={CreditCard}
          title="Datos de la factura"
          description="Estos datos crean la cuenta por pagar y definen como entra al cierre de caja."
        />
        <div className="mt-5 grid gap-5 md:grid-cols-3">
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
            label="Fecha vencimiento"
            type="date"
            value={formData.fecha_vencimiento}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, fecha_vencimiento: value }))
            }
          />
          <SelectField
            label="Forma de pago"
            value={formData.forma_pago}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, forma_pago: value }))
            }
            options={[
              { value: 'CONTADO', label: 'Contado' },
              { value: 'CREDITO', label: 'Credito' },
            ]}
          />
          <SelectField
            label={formData.forma_pago === 'CONTADO' ? 'Metodo de pago' : 'Metodo al abonar'}
            value={formData.metodo_pago}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, metodo_pago: value }))
            }
            options={[
              { value: 'EFECTIVO', label: 'Efectivo' },
              { value: 'TRANSFERENCIA', label: 'Transferencia' },
            ]}
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

      <section className="surface p-5 sm:p-6">
        <SectionHeader
          icon={Check}
          title="Totales de la factura"
          description="Si no agregas productos, estos valores son los que se usan para el gasto y la cuenta por pagar."
        />
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <Field
            label="Subtotal factura"
            type="number"
            min="0"
            step="0.01"
            clearOnFocus
            value={incluirProductos ? roundCurrencyInput(subtotalProductos) : formData.subtotal_manual}
            disabled={incluirProductos}
            onChange={(value) =>
              setFormData((prev) => {
                const defaultIva = resolveInvoiceIvaPercent(
                  prev.iva_manual,
                  value,
                );
                return {
                  ...prev,
                  subtotal_manual: value,
                  detalles: prev.detalles.map((item) =>
                    item.iva_bloqueado
                      ? { ...item, iva: defaultIva }
                      : item,
                  ),
                };
              })
            }
          />
          <Field
            label="IVA factura"
            type="number"
            min="0"
            step="0.01"
            clearOnFocus
            value={incluirProductos ? roundCurrencyInput(ivaProductos) : formData.iva_manual}
            disabled={incluirProductos}
            onChange={(value) =>
              setFormData((prev) => {
                const defaultIva = resolveInvoiceIvaPercent(
                  value,
                  prev.subtotal_manual,
                );
                return {
                  ...prev,
                  iva_manual: value,
                  detalles: prev.detalles.map((item) =>
                    item.iva_bloqueado
                      ? { ...item, iva: defaultIva }
                      : item,
                  ),
                };
              })
            }
          />
          <Field
            label="Total factura"
            type="number"
            min="0"
            step="0.01"
            clearOnFocus
            value={incluirProductos ? roundCurrencyInput(total) : formData.total_manual}
            disabled={incluirProductos}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, total_manual: value }))
            }
          />
          {incluirProductos && (
            <>
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
            </>
          )}
        </div>
      </section>

      <section className="surface overflow-hidden">
        <div className="border-b border-app p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <SectionHeader
              icon={PackagePlus}
              title="Productos de la factura"
              description="Opcional: usalo cuando quieras actualizar precios y stock con esta compra."
            />
            <Toggle
              checked={incluirProductos}
              onChange={handleToggleProductos}
              label="Agregar productos ahora"
            />
          </div>
        </div>

        {!incluirProductos ? (
          <div className="p-5 text-sm text-soft">
            La factura se registrara sin mover inventario. Luego puedes relacionar productos con el numero de factura desde el modulo de procesamiento.
          </div>
        ) : (
          <>
            <div className="divide-y divide-[var(--line)]">
              {formData.detalles.map((item, index) => {
                const transportePorLinea =
                  toMoney(item.precio_unitario) * (transportePorcentaje / 100);
                const costoFinal =
                  toMoney(item.precio_unitario) *
                    (1 + toMoney(item.iva) / 100) +
                  transportePorLinea;
                const ventaSugerida = calculateSuggestedSalePrice(
                  costoFinal,
                  salePricingRules,
                );
                return (
                  <div
                    key={`${index}-${item.producto}`}
                    className="grid gap-3 p-5 lg:grid-cols-[1.45fr_90px_130px_130px_76px_150px_44px]"
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
                          iva: item.iva_bloqueado
                            ? ivaFacturaPorcentaje
                            : producto?.iva
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
                      disabled={item.iva_bloqueado}
                      action={
                        <button
                          type="button"
                          onClick={() =>
                            updateItem(index, {
                              iva_bloqueado: !item.iva_bloqueado,
                              iva: item.iva_bloqueado
                                ? item.iva
                                : ivaFacturaPorcentaje,
                            })
                          }
                          className="mt-2 inline-flex min-h-8 w-full items-center justify-center rounded-md border border-app text-soft transition hover:bg-white/70"
                          title={item.iva_bloqueado ? 'Desbloquear IVA' : 'Bloquear IVA'}
                        >
                          {item.iva_bloqueado ? (
                            <Lock className="h-3.5 w-3.5" />
                          ) : (
                            <Unlock className="h-3.5 w-3.5" />
                          )}
                        </button>
                      }
                    />
                    <div className="rounded-xl border border-app bg-[var(--panel-soft)] px-3 py-3">
                      <p className="eyebrow">Subtotal</p>
                      <p className="mt-2 text-sm font-semibold text-main">
                        {formatCurrency(
                          toMoney(item.cantidad) *
                            toMoney(item.precio_unitario) *
                            (1 + toMoney(item.iva) / 100),
                        )}
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
          </>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Summary label="Subtotal" value={formatCurrency(subtotal)} />
        <Summary label="IVA" value={formatCurrency(ivaTotal)} />
        <Summary
          label={formData.forma_pago === 'CONTADO' ? 'Gasto hoy' : 'Saldo inicial'}
          value={formatCurrency(formData.forma_pago === 'CONTADO' ? total : saldoInicial)}
        />
        <Summary label="Total factura" value={formatCurrency(total)} strong />
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

const SectionHeader = ({ icon: Icon, title, description }) => (
  <div className="flex items-start gap-3">
    <div className="rounded-lg border border-app bg-[var(--panel-soft)] p-2 text-soft">
      <Icon className="h-4 w-4" />
    </div>
    <div>
      <div className="text-sm font-semibold text-main">{title}</div>
      <p className="mt-1 text-[12px] text-soft">{description}</p>
    </div>
  </div>
);

const Field = ({
  label,
  value,
  onChange,
  type = 'text',
  clearOnFocus = false,
  integerOnly = false,
  disabled = false,
  ...props
}) => (
  <label className="app-field">
    <span className="app-field-label">{label}</span>
    <input
      type={type}
      value={value}
      disabled={disabled}
      onFocus={(event) => {
        if (disabled) return;
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
      className="app-input min-h-11 disabled:cursor-not-allowed disabled:opacity-70"
      {...props}
    />
  </label>
);

const SelectField = ({ label, value, onChange, options }) => (
  <label className="app-field">
    <span className="app-field-label">{label}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="app-input min-h-11"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

const Toggle = ({ checked, onChange, label }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`inline-flex min-h-11 items-center gap-3 rounded-lg border px-4 text-sm font-semibold transition ${
      checked
        ? 'border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]'
        : 'border-app bg-white/72 text-main hover:bg-white'
    }`}
  >
    <span
      className={`flex h-5 w-5 items-center justify-center rounded-md border ${
        checked
          ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
          : 'border-app bg-transparent'
      }`}
    >
      {checked && <Check className="h-3.5 w-3.5" />}
    </span>
    {label}
  </button>
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
  }, [selectedName, query]);

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
  disabled = false,
  action = null,
}) => (
  <label className="app-field">
    <span className="app-field-label">{label}</span>
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
    />
    {action}
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
    className={`rounded-lg border p-4 ${
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
  </div>
);

export default FacturaCompraForm;

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  Barcode,
  CheckCircle,
  ImagePlus,
  Loader2,
  Package,
  Percent,
  Save,
  Sparkles,
  X,
} from 'lucide-react';
import { listarCategorias } from '../../services/inventario.service';
import { formatCurrency } from '../../utils/formatters';

const initialFormData = {
  codigo_interno: '',
  codigo_barras: '',
  nombre: '',
  unidad_medida_codigo: '94',
  estandar_codigo: '999',
  categoria_id: '',
  marca: '',
  descripcion: '',
  existencias: '0',
  invima: '',
  precio_compra: '',
  precio_venta: '',
  iva: '0',
  imagen: null,
  fecha_caducidad: '',
};

const getResults = (data) => data?.results || data || [];

const getInitialFormData = (producto) => {
  if (!producto) return initialFormData;
  return {
    codigo_interno: producto.codigo_interno || '',
    codigo_barras: producto.codigo_barras || '',
    nombre: producto.nombre || '',
    unidad_medida_codigo: producto.unidad_medida_codigo || '94',
    estandar_codigo: producto.estandar_codigo || '999',
    categoria_id: producto.categoria?.id || producto.categoria_id || '',
    marca: producto.marca || '',
    descripcion: producto.descripcion || '',
    existencias: producto.existencias ?? '0',
    invima: producto.invima || '',
    precio_compra: producto.precio_compra || '',
    precio_venta: producto.precio_venta || '',
    iva: producto.iva ?? '0',
    imagen: null,
    fecha_caducidad: producto.fecha_caducidad || '',
  };
};

const ProductoForm = ({ producto, onSubmit, onCancel, isLoading, error }) => {
  const [formData, setFormData] = useState(() => getInitialFormData(producto));
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const { data: categoriasData } = useQuery({
    queryKey: ['inventario', 'categorias'],
    queryFn: () => listarCategorias({ page_size: 100 }),
  });

  const previewUrl = useMemo(() => {
    if (formData.imagen instanceof File) return URL.createObjectURL(formData.imagen);
    return producto?.imagen || '';
  }, [formData.imagen, producto?.imagen]);

  useEffect(() => {
    if (!(formData.imagen instanceof File) || !previewUrl) return undefined;
    return () => URL.revokeObjectURL(previewUrl);
  }, [formData.imagen, previewUrl]);

  const precioCompra = Number(formData.precio_compra || 0);
  const precioVenta = Number(formData.precio_venta || 0);
  const iva = Number(formData.iva || 0);
  const margen =
    precioCompra > 0 ? ((precioVenta - precioCompra) / precioCompra) * 100 : 0;
  const precioSugerido =
    precioCompra > 0 ? precioCompra * (1 + iva / 100) * 1.3 : 0;

  const validators = {
    nombre: (value) => (!value.trim() ? 'El nombre es obligatorio' : null),
    existencias: (value) =>
      Number(value) < 0 || value === ''
        ? 'Las existencias no pueden ser negativas'
        : null,
    precio_compra: (value) =>
      Number(value) <= 0
        ? 'El precio de compra debe ser mayor que cero'
        : null,
    precio_venta: (value) =>
      Number(value) <= 0
        ? 'El precio de venta debe ser mayor que cero'
        : null,
    iva: (value) =>
      Number(value) < 0 || Number(value) > 100
        ? 'El IVA debe estar entre 0 y 100'
        : null,
    codigo_barras: (value) =>
      value && !/^[a-zA-Z0-9_.-]+$/.test(value)
        ? 'Codigo de barras invalido'
        : null,
    unidad_medida_codigo: (value) =>
      !String(value || '').trim()
        ? 'La unidad de medida es obligatoria'
        : null,
    estandar_codigo: (value) =>
      !String(value || '').trim()
        ? 'El codigo estandar es obligatorio'
        : null,
  };

  const validateField = (name, value) => validators[name]?.(value) || null;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (touched[name]) {
      setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    }
  };

  const handleBlur = (event) => {
    const { name, value } = event.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0] || null;
    setFormData((prev) => ({ ...prev, imagen: file }));
  };

  const validateForm = () => {
    const nextErrors = {};
    const nextTouched = {};
    Object.entries(formData).forEach(([field, value]) => {
      nextTouched[field] = true;
      const fieldError = validateField(field, value);
      if (fieldError) nextErrors[field] = fieldError;
    });
    if (precioVenta < precioCompra) {
      nextErrors.precio_venta =
        'El precio de venta no debe ser menor al precio de compra';
    }
    setTouched(nextTouched);
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    const payload = { ...formData };
    if (!payload.codigo_interno) delete payload.codigo_interno;
    if (!payload.fecha_caducidad) payload.fecha_caducidad = null;
    if (!payload.categoria_id) payload.categoria_id = null;
    onSubmit(payload);
  };

  const applySuggestedPrice = () => {
    setFormData((prev) => ({
      ...prev,
      precio_venta: Math.ceil(precioSugerido).toString(),
    }));
    setErrors((prev) => ({ ...prev, precio_venta: null }));
  };

  const categorias = getResults(categoriasData);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="surface p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
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
              <div className="eyebrow">Producto</div>
              <h1 className="section-title mt-2">
                {producto ? 'Editar producto' : 'Crear producto'}
              </h1>
              <p className="body-copy mt-2 max-w-2xl">
                Registra datos comerciales, stock, precios y evidencia visual
                del inventario con una jerarquia mas clara.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Kpi
              label="Margen"
              value={`${Number.isFinite(margen) ? margen.toFixed(1) : '0.0'}%`}
              tone={margen < 0 ? 'text-[var(--danger-text)]' : 'text-[var(--accent)]'}
            />
            <Kpi
              label="Venta sugerida"
              value={formatCurrency(precioSugerido)}
              tone="text-[var(--accent)]"
            />
            <Kpi label="IVA" value={`${iva.toFixed(2)}%`} tone="text-main" />
          </div>
        </div>
      </section>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-[rgba(159,47,45,0.18)] bg-[var(--danger-soft)] px-5 py-4 text-sm text-[var(--danger-text)]">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <section className="surface p-5 sm:p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg border border-[var(--accent-line)] bg-[var(--accent-soft)] p-3 text-[var(--accent)]">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h2 className="section-title">Datos del producto</h2>
              <p className="body-copy mt-1">
                Campos del modelo de inventario y validacion en tiempo real.
              </p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label="Codigo interno"
              name="codigo_interno"
              type="number"
              value={formData.codigo_interno}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={!!producto}
              helper="Dejalo vacio para autogenerar."
            />
            <Field
              label="Codigo de barras"
              name="codigo_barras"
              icon={<Barcode className="h-4 w-4" />}
              value={formData.codigo_barras}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.codigo_barras && errors.codigo_barras}
              placeholder="7700000000000"
            />
            <Field
              label="Nombre"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.nombre && errors.nombre}
              placeholder="Nombre comercial"
              className="md:col-span-2"
            />
            <Field
              label="Unidad medida"
              name="unidad_medida_codigo"
              value={formData.unidad_medida_codigo}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.unidad_medida_codigo && errors.unidad_medida_codigo}
              helper="Default Factus: 94"
            />
            <Field
              label="Codigo estandar"
              name="estandar_codigo"
              value={formData.estandar_codigo}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.estandar_codigo && errors.estandar_codigo}
              helper="Default Factus: 999"
            />

            <label className="app-field">
              <span className="app-field-label">Categoria</span>
              <select
                id="categoria_id"
                name="categoria_id"
                value={formData.categoria_id}
                onChange={handleChange}
                onBlur={handleBlur}
                className="app-select min-h-11"
              >
                <option value="">Sin categoria</option>
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nombre}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="Marca"
              name="marca"
              value={formData.marca}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Laboratorio / fabricante"
            />
            <Field
              label="INVIMA"
              name="invima"
              value={formData.invima}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Registro sanitario"
            />
            <Field
              label="Fecha caducidad"
              name="fecha_caducidad"
              type="date"
              value={formData.fecha_caducidad}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            <Field
              label="Existencias"
              name="existencias"
              type="number"
              min="0"
              step="0.01"
              value={formData.existencias}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.existencias && errors.existencias}
            />
            <Field
              label="IVA %"
              name="iva"
              icon={<Percent className="h-4 w-4" />}
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.iva}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.iva && errors.iva}
            />
            <Field
              label="Precio compra"
              name="precio_compra"
              type="number"
              min="0"
              step="0.01"
              value={formData.precio_compra}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.precio_compra && errors.precio_compra}
            />
            <div>
              <Field
                label="Precio venta"
                name="precio_venta"
                type="number"
                min="0"
                step="0.01"
                value={formData.precio_venta}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.precio_venta && errors.precio_venta}
              />
              {precioSugerido > 0 && (
                <button
                  type="button"
                  onClick={applySuggestedPrice}
                  className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-md border border-[var(--accent-line)] bg-[var(--accent-soft)] px-3 py-2 text-[12px] font-semibold text-[var(--accent)] transition"
                >
                  <Sparkles className="h-4 w-4" />
                  Usar sugerido {formatCurrency(precioSugerido)}
                </button>
              )}
            </div>
            <label className="app-field md:col-span-2">
              <span className="app-field-label">Descripcion</span>
              <textarea
                id="descripcion"
                name="descripcion"
                rows="5"
                value={formData.descripcion}
                onChange={handleChange}
                onBlur={handleBlur}
                className="app-textarea"
                placeholder="Caracteristicas, presentacion, notas de almacenamiento..."
              />
            </label>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="surface p-5 sm:p-6">
            <h2 className="section-title">Imagen del producto</h2>
            <div className="mt-4 overflow-hidden rounded-xl border border-dashed border-app bg-[var(--panel-soft)]">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview del producto"
                  className="h-64 w-full object-cover"
                />
              ) : (
                <div className="flex h-64 flex-col items-center justify-center text-muted">
                  <ImagePlus className="mb-3 h-12 w-12" />
                  Sin imagen
                </div>
              )}
            </div>
            <label className="mt-4 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-[var(--accent-line)] bg-[var(--accent-soft)] px-4 py-3 text-[12px] font-semibold text-[var(--accent)] transition">
              <ImagePlus className="h-4 w-4" />
              Subir imagen
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="sr-only"
              />
            </label>
          </section>

          <section className="surface p-5 sm:p-6">
            <h2 className="section-title">Revision rapida</h2>
            <div className="mt-4 space-y-3 text-sm">
              <CheckItem valid={!!formData.nombre.trim()} label="Nombre completo" />
              <CheckItem valid={precioCompra > 0} label="Precio de compra valido" />
              <CheckItem
                valid={precioVenta >= precioCompra && precioVenta > 0}
                label="Margen no negativo"
              />
              <CheckItem
                valid={Number(formData.existencias) >= 0}
                label="Stock valido"
              />
            </div>
          </section>
        </aside>
      </div>

      <div className="sticky bottom-4 z-10 rounded-xl border border-app bg-[var(--panel-strong)] p-4 shadow-[0_12px_30px_rgba(24,23,22,0.06)] backdrop-blur">
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="app-button-secondary min-h-11"
          >
            <X className="h-4 w-4" />
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="app-button-primary min-h-11"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {producto ? 'Actualizar producto' : 'Crear producto'}
          </button>
        </div>
      </div>
    </form>
  );
};

const Kpi = ({ label, value, tone }) => (
  <div className="rounded-xl border border-app bg-white/74 px-4 py-3">
    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted">
      {label}
    </p>
    <p className={`mt-2 text-sm font-semibold ${tone}`}>{value}</p>
  </div>
);

const Field = ({
  label,
  name,
  icon,
  error,
  helper,
  className = '',
  ...props
}) => (
  <div className={className}>
    <label className="app-field" htmlFor={name}>
      <span className="app-field-label">
        <span className="inline-flex items-center gap-2">
          {icon}
          {label}
        </span>
      </span>
      <input
        id={name}
        name={name}
        className={`app-input min-h-11 ${error ? 'border-[rgba(159,47,45,0.28)] focus:border-[rgba(159,47,45,0.42)] focus:shadow-none' : ''}`}
        {...props}
      />
    </label>
    {helper && <p className="mt-2 text-[12px] text-soft">{helper}</p>}
    {error && <p className="mt-2 text-[12px] text-[var(--danger-text)]">{error}</p>}
  </div>
);

const CheckItem = ({ valid, label }) => (
  <div
    className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
      valid
        ? 'border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]'
        : 'border-app bg-[var(--panel-soft)] text-soft'
    }`}
  >
    {valid ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
    <span className="text-sm font-semibold">{label}</span>
  </div>
);

export default ProductoForm;

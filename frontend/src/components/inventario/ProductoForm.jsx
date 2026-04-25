import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft, Barcode, CheckCircle, ImagePlus, Loader2, Package, Percent, Save, Sparkles, X } from 'lucide-react';
import { listarCategorias } from '../../services/inventario.service';
import { formatCurrency } from '../../utils/formatters';

const initialFormData = {
  codigo_interno: '',
  codigo_barras: '',
  nombre: '',
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
  const margen = precioCompra > 0 ? ((precioVenta - precioCompra) / precioCompra) * 100 : 0;
  const precioSugerido = precioCompra > 0 ? precioCompra * (1 + iva / 100) * 1.3 : 0;

  const validators = {
    nombre: (value) => (!value.trim() ? 'El nombre es obligatorio' : null),
    existencias: (value) => (Number(value) < 0 || value === '' ? 'Las existencias no pueden ser negativas' : null),
    precio_compra: (value) => (Number(value) <= 0 ? 'El precio de compra debe ser mayor que cero' : null),
    precio_venta: (value) => (Number(value) <= 0 ? 'El precio de venta debe ser mayor que cero' : null),
    iva: (value) => (Number(value) < 0 || Number(value) > 100 ? 'El IVA debe estar entre 0 y 100' : null),
    codigo_barras: (value) => (value && !/^[a-zA-Z0-9_.-]+$/.test(value) ? 'Código de barras inválido' : null),
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
      nextErrors.precio_venta = 'El precio de venta no debe ser menor al precio de compra';
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
    setFormData((prev) => ({ ...prev, precio_venta: Math.ceil(precioSugerido).toString() }));
    setErrors((prev) => ({ ...prev, precio_venta: null }));
  };

  const categorias = getResults(categoriasData);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-2xl">
        <button
          type="button"
          onClick={onCancel}
          className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/20"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">Producto</p>
            <h1 className="mt-2 text-3xl font-black md:text-4xl">{producto ? 'Editar producto' : 'Crear producto'}</h1>
            <p className="mt-2 max-w-2xl text-slate-300">Registra datos comerciales, stock, precios y evidencia visual del inventario.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Kpi label="Margen" value={`${Number.isFinite(margen) ? margen.toFixed(1) : '0.0'}%`} tone={margen < 0 ? 'text-red-300' : 'text-emerald-300'} />
            <Kpi label="Venta sugerida" value={formatCurrency(precioSugerido)} tone="text-emerald-300" />
            <Kpi label="IVA" value={`${iva.toFixed(2)}%`} tone="text-slate-100" />
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 font-medium text-red-800">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-950">Datos del producto</h2>
              <p className="text-sm text-slate-500">Campos del modelo de inventario y validación en tiempo real.</p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Código interno" name="codigo_interno" type="number" value={formData.codigo_interno} onChange={handleChange} onBlur={handleBlur} disabled={!!producto} helper="Déjalo vacío para autogenerar." />
            <Field label="Código de barras" name="codigo_barras" icon={<Barcode className="h-4 w-4" />} value={formData.codigo_barras} onChange={handleChange} onBlur={handleBlur} error={touched.codigo_barras && errors.codigo_barras} placeholder="7700000000000" />
            <Field label="Nombre *" name="nombre" value={formData.nombre} onChange={handleChange} onBlur={handleBlur} error={touched.nombre && errors.nombre} placeholder="Nombre comercial" className="md:col-span-2" />

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="categoria_id">Categoría</label>
              <select id="categoria_id" name="categoria_id" value={formData.categoria_id} onChange={handleChange} onBlur={handleBlur} className="min-h-11 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100">
                <option value="">Sin categoría</option>
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>
                ))}
              </select>
            </div>
            <Field label="Marca" name="marca" value={formData.marca} onChange={handleChange} onBlur={handleBlur} placeholder="Laboratorio / fabricante" />
            <Field label="INVIMA" name="invima" value={formData.invima} onChange={handleChange} onBlur={handleBlur} placeholder="Registro sanitario" />
            <Field label="Fecha caducidad" name="fecha_caducidad" type="date" value={formData.fecha_caducidad} onChange={handleChange} onBlur={handleBlur} />
            <Field label="Existencias *" name="existencias" type="number" min="0" step="0.01" value={formData.existencias} onChange={handleChange} onBlur={handleBlur} error={touched.existencias && errors.existencias} />
            <Field label="IVA % *" name="iva" icon={<Percent className="h-4 w-4" />} type="number" min="0" max="100" step="0.01" value={formData.iva} onChange={handleChange} onBlur={handleBlur} error={touched.iva && errors.iva} />
            <Field label="Precio compra *" name="precio_compra" type="number" min="0" step="0.01" value={formData.precio_compra} onChange={handleChange} onBlur={handleBlur} error={touched.precio_compra && errors.precio_compra} />
            <div>
              <Field label="Precio venta *" name="precio_venta" type="number" min="0" step="0.01" value={formData.precio_venta} onChange={handleChange} onBlur={handleBlur} error={touched.precio_venta && errors.precio_venta} />
              {precioSugerido > 0 && (
                <button type="button" onClick={applySuggestedPrice} className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100">
                  <Sparkles className="h-4 w-4" />
                  Usar sugerido {formatCurrency(precioSugerido)}
                </button>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="descripcion">Descripción</label>
              <textarea id="descripcion" name="descripcion" rows="5" value={formData.descripcion} onChange={handleChange} onBlur={handleBlur} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" placeholder="Características, presentación, notas de almacenamiento..." />
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="text-lg font-black text-slate-950">Imagen del producto</h2>
            <div className="mt-4 overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview del producto" className="h-64 w-full object-cover" />
              ) : (
                <div className="flex h-64 flex-col items-center justify-center text-slate-400">
                  <ImagePlus className="mb-3 h-12 w-12" />
                  Sin imagen
                </div>
              )}
            </div>
            <label className="mt-4 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 font-semibold text-emerald-700 transition hover:bg-emerald-100">
              <ImagePlus className="h-4 w-4" />
              Subir imagen
              <input type="file" accept="image/*" onChange={handleImageChange} className="sr-only" />
            </label>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="text-lg font-black text-slate-950">Revisión rápida</h2>
            <div className="mt-4 space-y-3 text-sm">
              <CheckItem valid={!!formData.nombre.trim()} label="Nombre completo" />
              <CheckItem valid={precioCompra > 0} label="Precio de compra válido" />
              <CheckItem valid={precioVenta >= precioCompra && precioVenta > 0} label="Margen no negativo" />
              <CheckItem valid={Number(formData.existencias) >= 0} label="Stock válido" />
            </div>
          </section>
        </aside>
      </div>

      <div className="sticky bottom-4 z-10 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur">
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={onCancel} disabled={isLoading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
            <X className="h-4 w-4" />
            Cancelar
          </button>
          <button type="submit" disabled={isLoading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {producto ? 'Actualizar producto' : 'Crear producto'}
          </button>
        </div>
      </div>
    </form>
  );
};

const Kpi = ({ label, value, tone }) => (
  <div className="rounded-2xl bg-white/10 px-4 py-3">
    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
    <p className={`mt-1 text-lg font-black ${tone}`}>{value}</p>
  </div>
);

const Field = ({ label, name, icon, error, helper, className = '', ...props }) => (
  <div className={className}>
    <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor={name}>
      <span className="flex items-center gap-2">{icon}{label}</span>
    </label>
    <input id={name} name={name} className={`min-h-11 w-full rounded-xl border px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100 disabled:text-slate-500 ${error ? 'border-red-300' : 'border-slate-300'}`} {...props} />
    {helper && <p className="mt-2 text-xs text-slate-500">{helper}</p>}
    {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
  </div>
);

const CheckItem = ({ valid, label }) => (
  <div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${valid ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-500'}`}>
    {valid ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
    <span className="font-semibold">{label}</span>
  </div>
);

export default ProductoForm;

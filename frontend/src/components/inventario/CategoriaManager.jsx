import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft, Edit3, FolderTree, Loader2, Plus, Save, Trash2, X } from 'lucide-react';
import {
  actualizarCategoria,
  crearCategoria,
  eliminarCategoria,
  listarCategorias,
} from '../../services/inventario.service';

const getResults = (data) => data?.results || data || [];

const CategoriaManager = ({ onBack, onToast }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({ nombre: '', descripcion: '' });
  const [categoriaEditando, setCategoriaEditando] = useState(null);
  const [errorLocal, setErrorLocal] = useState(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['inventario', 'categorias'],
    queryFn: () => listarCategorias({ page_size: 100 }),
  });

  const invalidateCategorias = () => {
    queryClient.invalidateQueries({ queryKey: ['inventario', 'categorias'] });
    queryClient.invalidateQueries({ queryKey: ['inventario', 'productos'] });
  };

  const guardarMutation = useMutation({
    mutationFn: (datos) =>
      categoriaEditando
        ? actualizarCategoria(categoriaEditando.id, datos)
        : crearCategoria(datos),
    onSuccess: () => {
      invalidateCategorias();
      setFormData({ nombre: '', descripcion: '' });
      setCategoriaEditando(null);
      setErrorLocal(null);
      onToast?.success(categoriaEditando ? 'Categoría actualizada' : 'Categoría creada');
    },
    onError: (mutationError) => setErrorLocal(extractApiError(mutationError, 'No fue posible guardar la categoría')),
  });

  const eliminarMutation = useMutation({
    mutationFn: eliminarCategoria,
    onSuccess: () => {
      invalidateCategorias();
      onToast?.success('Categoría eliminada');
    },
    onError: (mutationError) => onToast?.error(extractApiError(mutationError, 'No fue posible eliminar la categoría')),
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!formData.nombre.trim()) {
      setErrorLocal('El nombre de la categoría es obligatorio');
      return;
    }
    guardarMutation.mutate({
      nombre: formData.nombre.trim(),
      descripcion: formData.descripcion.trim(),
    });
  };

  const handleEdit = (categoria) => {
    setCategoriaEditando(categoria);
    setFormData({ nombre: categoria.nombre || '', descripcion: categoria.descripcion || '' });
    setErrorLocal(null);
  };

  const handleCancelEdit = () => {
    setCategoriaEditando(null);
    setFormData({ nombre: '', descripcion: '' });
    setErrorLocal(null);
  };

  const categorias = getResults(data);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="rounded-2xl bg-white/10 p-3 transition hover:bg-white/20"
            aria-label="Volver al inventario"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">Taxonomía</p>
            <h1 className="mt-1 text-2xl font-black">Gestión de categorías</h1>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-slate-200">
          {categorias.length} categoría{categorias.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
              <FolderTree className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                {categoriaEditando ? 'Editar categoría' : 'Nueva categoría'}
              </h2>
              <p className="text-sm text-slate-500">Organiza productos por líneas, marcas o familias.</p>
            </div>
          </div>

          {(errorLocal || isError) && (
            <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
              <AlertCircle className="h-4 w-4" />
              {errorLocal || error?.message}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="categoria_nombre">
                Nombre *
              </label>
              <input
                id="categoria_nombre"
                type="text"
                value={formData.nombre}
                onChange={(event) => setFormData((prev) => ({ ...prev, nombre: event.target.value }))}
                className="min-h-11 w-full rounded-xl border border-slate-300 px-4 py-3 uppercase outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                placeholder="MEDICAMENTOS"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="categoria_descripcion">
                Descripción
              </label>
              <textarea
                id="categoria_descripcion"
                rows="5"
                value={formData.descripcion}
                onChange={(event) => setFormData((prev) => ({ ...prev, descripcion: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                placeholder="Productos de alta rotación, material quirúrgico, suplementos..."
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {categoriaEditando && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
                Cancelar edición
              </button>
            )}
            <button
              type="submit"
              disabled={guardarMutation.isPending}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {guardarMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar categoría
            </button>
          </div>
        </form>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xl sm:p-6">
          {isLoading ? (
            <div className="flex min-h-72 items-center justify-center text-slate-600">
              <Loader2 className="mr-2 h-5 w-5 animate-spin text-emerald-600" />
              Cargando categorías...
            </div>
          ) : categorias.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 text-center">
              <Plus className="mb-3 h-10 w-10 text-slate-300" />
              <p className="font-semibold text-slate-800">No hay categorías registradas</p>
              <p className="mt-1 text-sm text-slate-500">Crea la primera para clasificar tus productos.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {categorias.map((categoria) => (
                <div
                  key={categoria.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-950">{categoria.nombre}</h3>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {categoria.productos_count || 0} producto{Number(categoria.productos_count || 0) !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{categoria.descripcion || 'Sin descripción'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(categoria)}
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-emerald-700"
                    >
                      <Edit3 className="h-4 w-4" />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => eliminarMutation.mutate(categoria.id)}
                      disabled={eliminarMutation.isPending}
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const extractApiError = (error, fallback) => {
  const data = error?.response?.data;
  if (!data) return fallback;
  if (data.detail) return data.detail;
  if (data.error) return data.error;
  const firstKey = Object.keys(data)[0];
  if (!firstKey) return fallback;
  const value = data[firstKey];
  return `${firstKey}: ${Array.isArray(value) ? value[0] : value}`;
};

export default CategoriaManager;

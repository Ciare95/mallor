import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  Edit3,
  FolderTree,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
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
      onToast?.success(
        categoriaEditando ? 'Categoria actualizada' : 'Categoria creada',
      );
    },
    onError: (mutationError) =>
      setErrorLocal(extractApiError(mutationError, 'No fue posible guardar la categoria')),
  });

  const eliminarMutation = useMutation({
    mutationFn: eliminarCategoria,
    onSuccess: () => {
      invalidateCategorias();
      onToast?.success('Categoria eliminada');
    },
    onError: (mutationError) =>
      onToast?.error(extractApiError(mutationError, 'No fue posible eliminar la categoria')),
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!formData.nombre.trim()) {
      setErrorLocal('El nombre de la categoria es obligatorio');
      return;
    }
    guardarMutation.mutate({
      nombre: formData.nombre.trim(),
      descripcion: formData.descripcion.trim(),
    });
  };

  const handleEdit = (categoria) => {
    setCategoriaEditando(categoria);
    setFormData({
      nombre: categoria.nombre || '',
      descripcion: categoria.descripcion || '',
    });
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
      <section className="surface p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={onBack}
              className="app-button-secondary min-h-11"
              aria-label="Volver al inventario"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </button>
            <div>
              <div className="eyebrow">Taxonomia</div>
              <h1 className="section-title mt-2">Gestion de categorias</h1>
              <p className="body-copy mt-2">
                Organiza lineas, familias o marcas sin perder legibilidad en la
                vista operativa.
              </p>
            </div>
          </div>
          <div className="app-pill">
            {categorias.length} categoria{categorias.length !== 1 ? 's' : ''}
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.88fr_1.12fr]">
        <form onSubmit={handleSubmit} className="surface p-5 sm:p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg border border-[var(--accent-line)] bg-[var(--accent-soft)] p-3 text-[var(--accent)]">
              <FolderTree className="h-5 w-5" />
            </div>
            <div>
              <h2 className="section-title">
                {categoriaEditando ? 'Editar categoria' : 'Nueva categoria'}
              </h2>
              <p className="body-copy mt-1">
                Define etiquetas claras para que inventario y compras compartan
                el mismo lenguaje.
              </p>
            </div>
          </div>

          {(errorLocal || isError) && (
            <div className="mb-5 flex items-center gap-2 rounded-xl border border-[rgba(159,47,45,0.18)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger-text)]">
              <AlertCircle className="h-4 w-4" />
              {errorLocal || error?.message}
            </div>
          )}

          <div className="space-y-5">
            <label className="app-field">
              <span className="app-field-label">Nombre</span>
              <input
                id="categoria_nombre"
                type="text"
                value={formData.nombre}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, nombre: event.target.value }))
                }
                className="app-input min-h-11 uppercase"
                placeholder="MEDICAMENTOS"
              />
            </label>

            <label className="app-field">
              <span className="app-field-label">Descripcion</span>
              <textarea
                id="categoria_descripcion"
                rows="5"
                value={formData.descripcion}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    descripcion: event.target.value,
                  }))
                }
                className="app-textarea"
                placeholder="Productos de alta rotacion, material quirurgico, suplementos..."
              />
            </label>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {categoriaEditando && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="app-button-secondary min-h-11"
              >
                <X className="h-4 w-4" />
                Cancelar edicion
              </button>
            )}
            <button
              type="submit"
              disabled={guardarMutation.isPending}
              className="app-button-primary min-h-11"
            >
              {guardarMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Guardar categoria
            </button>
          </div>
        </form>

        <section className="surface p-4 sm:p-6">
          {isLoading ? (
            <div className="flex min-h-72 items-center justify-center text-soft">
              <Loader2 className="mr-2 h-5 w-5 animate-spin text-muted" />
              Cargando categorias...
            </div>
          ) : categorias.length === 0 ? (
            <div className="empty-state min-h-72">
              <Plus className="mb-3 h-10 w-10 text-muted" />
              <p className="text-sm font-semibold text-main">
                No hay categorias registradas
              </p>
              <p className="mt-1 text-[13px] text-soft">
                Crea la primera para clasificar tus productos.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {categorias.map((categoria) => (
                <div
                  key={categoria.id}
                  className="tab-card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-main">
                        {categoria.nombre}
                      </h3>
                      <span className="app-pill">
                        {categoria.productos_count || 0} producto
                        {Number(categoria.productos_count || 0) !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="mt-2 text-[13px] text-soft">
                      {categoria.descripcion || 'Sin descripcion'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(categoria)}
                      className="app-button-ghost min-h-10"
                    >
                      <Edit3 className="h-4 w-4" />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => eliminarMutation.mutate(categoria.id)}
                      disabled={eliminarMutation.isPending}
                      className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[rgba(159,47,45,0.18)] bg-[var(--danger-soft)] px-3 py-2 text-[12px] font-semibold text-[var(--danger-text)] transition disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
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

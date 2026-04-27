import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react';
import useToast from '../../hooks/useToast';
import { ToastContainer } from '../ui/Toast';
import {
  ajustarStock,
  actualizarProducto,
  crearProducto,
  eliminarProducto,
  procesarFacturaCompra,
  registrarFacturaCompra,
} from '../../services/inventario.service';
import { INVENTARIO_VISTAS, useInventarioStore } from '../../store/useInventarioStore';
import AjusteStockModal from './AjusteStockModal';
import CategoriaManager from './CategoriaManager';
import FacturaCompraForm from './FacturaCompraForm';
import ProcesarFacturaForm from './ProcesarFacturaForm';
import ProductoDetail from './ProductoDetail';
import ProductoForm from './ProductoForm';
import ProductosList from './ProductosList';

const ProductosPage = () => {
  const queryClient = useQueryClient();
  const { toasts, toast, closeToast } = useToast();
  const {
    vistaActual,
    productoSeleccionado,
    setVistaActual,
    setProductoSeleccionado,
    resetInventarioUi,
  } = useInventarioStore();
  const productoAEliminar = useInventarioStore((state) => state.productoAEliminar);
  const productoAjuste = useInventarioStore((state) => state.productoAjuste);

  const setTransient = useInventarioStore.setState;

  const invalidateInventario = () => {
    queryClient.invalidateQueries({ queryKey: ['inventario'] });
  };

  const crearMutation = useMutation({
    mutationFn: crearProducto,
    onSuccess: (producto) => {
      invalidateInventario();
      toast.success(`Producto ${producto.nombre} creado correctamente`);
      setProductoSeleccionado(producto);
      setVistaActual(INVENTARIO_VISTAS.DETALLE);
    },
    onError: (error) => toast.error(extractApiError(error, 'No fue posible crear el producto')),
  });

  const actualizarMutation = useMutation({
    mutationFn: ({ id, datos }) => actualizarProducto(id, datos),
    onSuccess: (producto) => {
      invalidateInventario();
      toast.success(`Producto ${producto.nombre} actualizado`);
      setProductoSeleccionado(producto);
      setVistaActual(INVENTARIO_VISTAS.DETALLE);
    },
    onError: (error) => toast.error(extractApiError(error, 'No fue posible actualizar el producto')),
  });

  const eliminarMutation = useMutation({
    mutationFn: eliminarProducto,
    onSuccess: () => {
      invalidateInventario();
      toast.success('Producto eliminado correctamente');
      setTransient({ productoAEliminar: null, productoSeleccionado: null, vistaActual: INVENTARIO_VISTAS.LISTA });
    },
    onError: (error) => {
      toast.error(extractApiError(error, 'No fue posible eliminar el producto'));
      setTransient({ productoAEliminar: null });
    },
  });

  const ajustarStockMutation = useMutation({
    mutationFn: ({ id, datos }) => ajustarStock(id, datos),
    onSuccess: () => {
      invalidateInventario();
      toast.success('Stock ajustado correctamente');
      setTransient({ productoAjuste: null });
    },
    onError: (error) => toast.error(extractApiError(error, 'No fue posible ajustar el stock')),
  });

  const registrarFacturaMutation = useMutation({
    mutationFn: registrarFacturaCompra,
    onSuccess: (factura) => {
      invalidateInventario();
      toast.success(`Factura ${factura.numero_factura} registrada`);
      setVistaActual(INVENTARIO_VISTAS.PROCESAR_FACTURA);
    },
    onError: (error) => toast.error(extractApiError(error, 'No fue posible registrar la factura')),
  });

  const procesarFacturaMutation = useMutation({
    mutationFn: procesarFacturaCompra,
    onSuccess: (factura) => {
      invalidateInventario();
      toast.success(`Factura ${factura.numero_factura} procesada y stock actualizado`);
      setVistaActual(INVENTARIO_VISTAS.LISTA);
    },
    onError: (error) => toast.error(extractApiError(error, 'No fue posible procesar la factura')),
  });

  const handleSubmitProducto = (datos) => {
    if (vistaActual === INVENTARIO_VISTAS.EDITAR && productoSeleccionado) {
      actualizarMutation.mutate({ id: productoSeleccionado.id, datos });
      return;
    }
    crearMutation.mutate(datos);
  };

  const goList = () => {
    resetInventarioUi();
  };

  return (
    <div className="min-h-full">
      {vistaActual === INVENTARIO_VISTAS.LISTA && (
        <ProductosList
          onCreate={() => { setProductoSeleccionado(null); setVistaActual(INVENTARIO_VISTAS.CREAR); }}
          onView={(producto) => { setProductoSeleccionado(producto); setVistaActual(INVENTARIO_VISTAS.DETALLE); }}
          onEdit={(producto) => { setProductoSeleccionado(producto); setVistaActual(INVENTARIO_VISTAS.EDITAR); }}
          onDelete={(producto) => setTransient({ productoAEliminar: producto })}
          onAdjustStock={(producto) => setTransient({ productoAjuste: producto })}
          onManageCategories={() => setVistaActual(INVENTARIO_VISTAS.CATEGORIAS)}
          onCreateInvoice={() => setVistaActual(INVENTARIO_VISTAS.FACTURA)}
          onProcessInvoice={() => setVistaActual(INVENTARIO_VISTAS.PROCESAR_FACTURA)}
          onToast={toast}
        />
      )}

      {(vistaActual === INVENTARIO_VISTAS.CREAR || vistaActual === INVENTARIO_VISTAS.EDITAR) && (
        <ProductoForm
          key={`${vistaActual}-${productoSeleccionado?.id || 'nuevo'}`}
          producto={vistaActual === INVENTARIO_VISTAS.EDITAR ? productoSeleccionado : null}
          onSubmit={handleSubmitProducto}
          onCancel={goList}
          isLoading={crearMutation.isPending || actualizarMutation.isPending}
          error={extractMutationError(vistaActual === INVENTARIO_VISTAS.CREAR ? crearMutation : actualizarMutation)}
        />
      )}

      {vistaActual === INVENTARIO_VISTAS.DETALLE && productoSeleccionado && (
        <ProductoDetail
          productoId={productoSeleccionado.id}
          onBack={goList}
          onEdit={(producto) => { setProductoSeleccionado(producto); setVistaActual(INVENTARIO_VISTAS.EDITAR); }}
          onDelete={(producto) => setTransient({ productoAEliminar: producto })}
          onAdjustStock={(producto) => setTransient({ productoAjuste: producto })}
        />
      )}

      {vistaActual === INVENTARIO_VISTAS.CATEGORIAS && (
        <CategoriaManager onBack={goList} onToast={toast} />
      )}

      {vistaActual === INVENTARIO_VISTAS.FACTURA && (
        <FacturaCompraForm
          onSubmit={(datos) => registrarFacturaMutation.mutate(datos)}
          onCancel={goList}
          isLoading={registrarFacturaMutation.isPending}
          error={extractMutationError(registrarFacturaMutation)}
        />
      )}

      {vistaActual === INVENTARIO_VISTAS.PROCESAR_FACTURA && (
        <ProcesarFacturaForm
          onProcess={(payload) => procesarFacturaMutation.mutate(payload)}
          onCancel={goList}
          onCreateProduct={() => { setProductoSeleccionado(null); setVistaActual(INVENTARIO_VISTAS.CREAR); }}
          isLoading={procesarFacturaMutation.isPending}
          error={extractMutationError(procesarFacturaMutation)}
        />
      )}

      {productoAEliminar && (
        <ConfirmDeleteProducto
          producto={productoAEliminar}
          isLoading={eliminarMutation.isPending}
          onCancel={() => setTransient({ productoAEliminar: null })}
          onConfirm={() => eliminarMutation.mutate(productoAEliminar.id)}
        />
      )}

      {productoAjuste && (
        <AjusteStockModal
          producto={productoAjuste}
          isLoading={ajustarStockMutation.isPending}
          error={extractMutationError(ajustarStockMutation)}
          onCancel={() => setTransient({ productoAjuste: null })}
          onConfirm={(datos) => ajustarStockMutation.mutate({ id: productoAjuste.id, datos })}
        />
      )}

      <ToastContainer toasts={toasts} onClose={closeToast} />
    </div>
  );
};

const ConfirmDeleteProducto = ({ producto, isLoading, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
    <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
      <div className="flex items-start justify-between gap-4">
        <div className="rounded-2xl bg-red-100 p-3 text-red-700">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <button type="button" onClick={onCancel} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100" aria-label="Cerrar"><X className="h-5 w-5" /></button>
      </div>
      <h2 className="mt-5 text-2xl font-black text-slate-950">Eliminar producto</h2>
      <p className="mt-2 text-slate-600">Esta acción intentará eliminar <strong>{producto.nombre}</strong>. El backend impedirá eliminarlo si tiene movimientos asociados.</p>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} disabled={isLoading} className="min-h-11 rounded-xl border border-slate-300 px-5 py-2.5 font-semibold text-slate-700">Cancelar</button>
        <button type="button" onClick={onConfirm} disabled={isLoading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 font-semibold text-white transition hover:bg-red-700 disabled:opacity-60">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Eliminar
        </button>
      </div>
    </div>
  </div>
);

const extractMutationError = (mutation) => {
  if (!mutation.isError) return null;
  return extractApiError(mutation.error, 'Ocurrió un error inesperado');
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

export default ProductosPage;

import { useMutation } from '@tanstack/react-query';
import { Download, Loader2 } from 'lucide-react';
import { exportarInventarioExcel } from '../../services/inventario.service';
import { triggerExcelDownload } from './excelDownload';

const ExportarInventario = ({ onSuccess, onError }) => {
  const exportMutation = useMutation({
    mutationFn: exportarInventarioExcel,
    onSuccess: (response) => {
      triggerExcelDownload(response, 'inventario');
      onSuccess?.('Inventario exportado correctamente');
    },
    onError: () => onError?.('No fue posible exportar el inventario'),
  });

  return (
    <button
      type="button"
      onClick={() => exportMutation.mutate()}
      disabled={exportMutation.isPending}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {exportMutation.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      Exportar Excel
    </button>
  );
};

export default ExportarInventario;

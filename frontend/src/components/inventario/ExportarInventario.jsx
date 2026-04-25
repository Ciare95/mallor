import { useMutation } from '@tanstack/react-query';
import { Download, Loader2 } from 'lucide-react';
import { exportarInventarioExcel } from '../../services/inventario.service';

const getFilename = (headers) => {
  const disposition = headers?.['content-disposition'];
  const match = disposition?.match(/filename="?([^";]+)"?/i);
  return match?.[1] || `inventario_${new Date().toISOString().slice(0, 10)}.xlsx`;
};

const ExportarInventario = ({ onSuccess, onError }) => {
  const exportMutation = useMutation({
    mutationFn: exportarInventarioExcel,
    onSuccess: (response) => {
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = getFilename(response.headers);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
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

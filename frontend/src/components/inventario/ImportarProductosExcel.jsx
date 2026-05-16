import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Download, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import {
  descargarPlantillaProductosExcel,
  importarProductosExcel,
} from '../../services/inventario.service';
import { triggerExcelDownload } from './excelDownload';

const ImportarProductosExcel = ({
  onImportSuccess,
  onToast,
}) => {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importErrors, setImportErrors] = useState([]);
  const [serverMessage, setServerMessage] = useState('');

  const downloadMutation = useMutation({
    mutationFn: descargarPlantillaProductosExcel,
    onSuccess: (response) => {
      triggerExcelDownload(response, 'plantilla_productos');
      onToast?.success?.('Plantilla descargada correctamente');
    },
    onError: () => {
      onToast?.error?.('No fue posible descargar la plantilla');
    },
  });

  const importMutation = useMutation({
    mutationFn: importarProductosExcel,
    onSuccess: (response) => {
      setImportErrors([]);
      setServerMessage(response.message);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onImportSuccess?.(response);
      onToast?.success?.(
        `${response.message} Se importaron ${response.imported_count} productos.`
      );
    },
    onError: (error) => {
      const payload = error?.response?.data;
      setImportErrors(payload?.errors || []);
      setServerMessage(
        payload?.message
        || 'No se pudo importar el archivo. Intenta de nuevo.'
      );
      onToast?.error?.(
        payload?.message
        || 'No se pudo importar el archivo Excel'
      );
    },
  });

  return (
    <div className="rounded-xl border border-app bg-white/80 p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="eyebrow">Carga masiva</p>
          <p className="mt-1 text-[13px] text-soft">
            Descarga la plantilla, completa los productos y súbela en formato
            .xlsx.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => downloadMutation.mutate()}
            disabled={downloadMutation.isPending}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-sky-200 bg-white px-4 py-2.5 text-sm font-semibold text-sky-700 shadow-sm transition hover:border-sky-300 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {downloadMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Descargar plantilla
          </button>

          <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-app bg-white px-4 py-2.5 text-sm font-semibold text-main shadow-sm transition hover:bg-slate-50">
            <FileSpreadsheet className="h-4 w-4" />
            {selectedFile ? selectedFile.name : 'Seleccionar Excel'}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0] || null;
                setSelectedFile(file);
                setImportErrors([]);
                setServerMessage('');
              }}
            />
          </label>

          <button
            type="button"
            onClick={() => selectedFile && importMutation.mutate(selectedFile)}
            disabled={!selectedFile || importMutation.isPending}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 shadow-sm transition hover:border-amber-300 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {importMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Importar Excel
          </button>
        </div>
      </div>

      {serverMessage ? (
        <div
          className={`mt-4 rounded-xl border px-4 py-3 text-[13px] ${
            importErrors.length
              ? 'border-[rgba(159,47,45,0.18)] bg-[var(--danger-soft)] text-[var(--danger-text)]'
              : 'border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]'
          }`}
        >
          {serverMessage}
        </div>
      ) : null}

      {importErrors.length > 0 ? (
        <div className="mt-4 overflow-x-auto rounded-xl border border-[rgba(159,47,45,0.18)]">
          <table className="w-full min-w-[720px]">
            <thead className="bg-[var(--danger-soft)] text-left text-[12px] font-semibold text-[var(--danger-text)]">
              <tr>
                <th className="px-4 py-3">Fila</th>
                <th className="px-4 py-3">Columna</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)] bg-white">
              {importErrors.map((item, index) => (
                <tr key={`${item.row}-${item.column}-${index}`}>
                  <td className="px-4 py-3 text-[12px] text-soft">{item.row}</td>
                  <td className="px-4 py-3 text-[12px] font-semibold text-main">{item.column}</td>
                  <td className="px-4 py-3 text-[12px] text-soft">{item.value || 'Vacio'}</td>
                  <td className="px-4 py-3 text-[12px] text-[var(--danger-text)]">{item.error}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
};

export default ImportarProductosExcel;

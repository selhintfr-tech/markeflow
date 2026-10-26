import React, { useState } from 'react';
import { salesService, type OzonImportPreviewResponse, type OzonImportRow } from '../salesService';

interface ImportOzonParcelsModalProps {
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const ImportOzonParcelsModal: React.FC<ImportOzonParcelsModalProps> = ({
  workspaceId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [csvText, setCsvText] = useState('');
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [preview, setPreview] = useState<OzonImportPreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
    };
    reader.onerror = () => {
      setError('Unable to read the uploaded file.');
    };
    reader.readAsText(file);
  };

  const handlePreview = async () => {
    if (!csvText.trim()) {
      setError('Please select a file or paste CSV/TSV content.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await salesService.importOzonPreview(workspaceId, csvText);
      setPreview(res);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to parse parcel export.');
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!preview || preview.rows.length === 0) return;

    setImporting(true);
    setError('');
    try {
      const res = await salesService.importOzonExecute(workspaceId, preview.rows);
      onSuccess(res.message);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to complete parcel import.');
    } finally {
      setImporting(false);
    }
  };

  const resetAll = () => {
    setCsvText('');
    setPreview(null);
    setError('');
    setFileInputKey(Date.now());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Import Ozon Express Parcels</h2>
            <p className="mt-1 text-sm text-slate-600">
              Reconcile parcels created on the Ozon website with MarketFlow orders and shipments safely.
            </p>
          </div>
          <button
            type="button"
            onClick={resetAll}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        {error && (
          <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {!preview ? (
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Upload Ozon Export File (.csv, .txt)</label>
              <input
                key={fileInputKey}
                type="file"
                accept=".csv,.txt,.tsv"
                onChange={handleFileUpload}
                className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-violet-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-violet-700 hover:file:bg-violet-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Or Paste Export Content (CSV / Tabular)</label>
              <textarea
                rows={6}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="Code Suivi,Destinataire,Telephone,Ville,CRBT,Statut,Reference&#10;OZON-1001,Karim Bennani,0612345678,Marrakech,285,Livré,ORD-101"
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-mono outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              />
            </div>

            <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 text-xs text-blue-800">
              <span className="font-semibold">Safe Data Policy:</span> This import verifies order references, tracking numbers, and customer phones. Parcels without an exact verified order match are routed to the Delivery Review Queue without inventing fake sales orders or financial records.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={resetAll}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading || !csvText.trim()}
                onClick={() => void handlePreview()}
                className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-50"
              >
                {loading ? 'Analyzing Export…' : 'Analyze & Preview Match'}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
                <span className="block text-xl font-bold text-slate-900">{preview.total_rows}</span>
                <span className="text-xs text-slate-600">Total in Export</span>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">
                <span className="block text-xl font-bold text-emerald-700">{preview.matched_tracking_count}</span>
                <span className="text-xs text-emerald-800">Existing Shipments</span>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-center">
                <span className="block text-xl font-bold text-blue-700">{preview.matched_order_count + preview.matched_customer_count}</span>
                <span className="text-xs text-blue-800">Matched to Orders</span>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
                <span className="block text-xl font-bold text-amber-700">{preview.review_queue_count}</span>
                <span className="text-xs text-amber-800">Review Queue</span>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200 text-xs">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">Tracking / Ref</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">Recipient</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">Status</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">Match Result</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">Proposed Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {preview.rows.map((row: OzonImportRow) => (
                    <tr key={row.row_index} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono font-medium text-slate-900">
                        {row.tracking_number}
                        {row.order_reference && <div className="text-[10px] text-slate-500 font-sans">Ref: {row.order_reference}</div>}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {row.recipient_name || '—'}
                        {row.phone && <div className="text-[10px] text-slate-500">{row.phone}</div>}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium">{row.normalized_status}</span>
                      </td>
                      <td className="px-3 py-2">
                        {row.match_type === 'tracking_number' && (
                          <span className="text-emerald-700 font-medium">✓ Existing Shipment</span>
                        )}
                        {row.match_type === 'order_reference' && (
                          <span className="text-blue-700 font-medium">✓ Order {row.matched_order_number}</span>
                        )}
                        {row.match_type === 'customer_single_open_order' && (
                          <span className="text-purple-700 font-medium">✓ Customer {row.matched_customer_name}</span>
                        )}
                        {(row.match_type === 'none' || row.match_type.includes('ambiguous')) && (
                          <span className="text-amber-700 font-medium">⚠ Review Queue</span>
                        )}
                        <div className="text-[10px] text-slate-500">{row.explanation}</div>
                      </td>
                      <td className="px-3 py-2">
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {row.proposed_action}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                ← Choose another file
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={resetAll}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={importing}
                  onClick={() => void handleExecute()}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {importing ? 'Importing…' : 'Confirm Safe Import'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

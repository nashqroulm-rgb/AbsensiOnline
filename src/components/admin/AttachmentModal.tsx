import { useState, useEffect } from 'react';
import { Download, FileText, Image, CheckCircle, XCircle } from 'lucide-react';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import { getStatusBadgeVariant } from '../ui/Badge';
import type { Attachment } from '../../types';

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  attachments: Attachment[];
  userNama: string;
  onVerify?: (id: string, status: 'terverifikasi' | 'ditolak') => void;
}

export default function AttachmentModal({ isOpen, onClose, attachments, userNama, onVerify }: Props) {
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) { setPreviewIdx(null); setVerifyingId(null); }
  }, [isOpen]);

  const handleVerify = async (id: string, status: 'terverifikasi' | 'ditolak') => {
    setVerifyingId(id);
    await onVerify?.(id, status);
    setVerifyingId(null);
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={`Lampiran — ${userNama}`} size="xl">
        <div className="p-5">
          {attachments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Tidak ada lampiran</p>
          ) : (
            <div className="space-y-3">
              {attachments.map((att, idx) => (
                <div key={att.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                    {att.tipe === 'foto' ? <Image size={18} className="text-blue-500" /> : <FileText size={18} className="text-amber-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{att.nama_file}</p>
                    <p className="text-xs text-gray-400">{formatSize(att.ukuran_bytes)} · {att.tipe} · {new Date(att.created_at).toLocaleString('id-ID')}</p>
                  </div>
                  <Badge variant={getStatusBadgeVariant(att.status_verifikasi)} dot>
                    {att.status_verifikasi === 'terverifikasi' ? 'Terverifikasi' : att.status_verifikasi === 'ditolak' ? 'Ditolak' : 'Menunggu'}
                  </Badge>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {att.tipe === 'foto' ? (
                      <button onClick={() => setPreviewIdx(idx)}
                        className="p-2 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-600 transition-colors" title="Preview">
                        <Image size={16} />
                      </button>
                    ) : (
                      <a href={att.url} target="_blank" rel="noopener noreferrer"
                        className="p-2 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-600 transition-colors" title="Buka">
                        <FileText size={16} />
                      </a>
                    )}
                    <a href={att.url} download={att.nama_file}
                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors" title="Download">
                      <Download size={16} />
                    </a>
                    {onVerify && att.status_verifikasi === 'menunggu' && (
                      <>
                        <button onClick={() => handleVerify(att.id, 'terverifikasi')} disabled={verifyingId === att.id}
                          className="p-2 hover:bg-green-50 rounded-lg text-gray-400 hover:text-green-600 transition-colors disabled:opacity-50" title="Verifikasi">
                          <CheckCircle size={16} />
                        </button>
                        <button onClick={() => handleVerify(att.id, 'ditolak')} disabled={verifyingId === att.id}
                          className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50" title="Tolak">
                          <XCircle size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Full preview modal */}
      {previewIdx !== null && attachments[previewIdx] && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setPreviewIdx(null)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <img src={attachments[previewIdx].url} alt={attachments[previewIdx].nama_file}
            className="relative z-10 max-w-full max-h-[90vh] rounded-xl object-contain shadow-2xl" />
          <button onClick={() => setPreviewIdx(null)}
            className="absolute top-4 right-4 z-20 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
            ✕
          </button>
        </div>
      )}
    </>
  );
}

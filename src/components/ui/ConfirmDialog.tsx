import Modal from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
}

const variantStyles = {
  danger: 'bg-red-600 hover:bg-red-700',
  warning: 'bg-amber-500 hover:bg-amber-600',
  primary: 'bg-green-600 hover:bg-green-700',
};

export default function ConfirmDialog({
  isOpen, onClose, onConfirm, title, message,
  confirmLabel = 'Ya', cancelLabel = 'Batal', variant = 'danger',
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="p-5 space-y-4">
        <p className="text-sm text-gray-600">{message}</p>
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 font-medium">
            {cancelLabel}
          </button>
          <button onClick={() => { onConfirm(); onClose(); }}
            className={`flex-1 py-2.5 text-white rounded-lg text-sm font-medium ${variantStyles[variant]}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

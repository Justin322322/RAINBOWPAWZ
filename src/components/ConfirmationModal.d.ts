import { ReactNode } from 'react';

declare interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
  icon?: ReactNode;
}

declare const ConfirmationModal: React.FC<ConfirmationModalProps>;

export default ConfirmationModal;

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

export interface ModalInstance {
  id: string;
  close: () => void;
  priority?: number;
}

interface ModalContextType {
  registerModal: (id: string, close: () => void, priority?: number) => () => void;
  closeTopModal: () => boolean;
  hasOpenModal: boolean;
  openModalCount: number;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const modalStackRef = useRef<ModalInstance[]>([]);
  const [openModalCount, setOpenModalCount] = useState<number>(0);

  const registerModal = useCallback((id: string, close: () => void, priority: number = 0) => {
    // Remove if already exists with same id
    modalStackRef.current = modalStackRef.current.filter(m => m.id !== id);
    modalStackRef.current.push({ id, close, priority });
    setOpenModalCount(modalStackRef.current.length);

    return () => {
      modalStackRef.current = modalStackRef.current.filter(m => m.id !== id);
      setOpenModalCount(modalStackRef.current.length);
    };
  }, []);

  const closeTopModal = useCallback((): boolean => {
    // 1. Try closing from React modal stack
    if (modalStackRef.current.length > 0) {
      const topModal = modalStackRef.current.pop();
      setOpenModalCount(modalStackRef.current.length);
      if (topModal && typeof topModal.close === 'function') {
        try {
          topModal.close();
          return true;
        } catch (err) {
          console.error('Error closing top modal from stack:', err);
        }
      }
    }

    // 2. DOM-level fallback: check for any open modal/popup elements in the DOM
    const openModals = document.querySelectorAll(
      '[data-modal="true"], [role="dialog"], .fixed.inset-0.z-50, .fixed.inset-0.z-60, .fixed.inset-0.z-40'
    );

    if (openModals && openModals.length > 0) {
      const topDomModal = openModals[openModals.length - 1] as HTMLElement;
      // Look for a close button inside the modal
      const closeBtn = topDomModal.querySelector(
        'button[data-modal-close], button[aria-label="Close"], button[aria-label="Tutup"], button.text-slate-400, button:has(svg.lucide-x), button:has(svg)'
      ) as HTMLElement | null;

      if (closeBtn) {
        closeBtn.click();
        return true;
      }

      // Or try clicking backdrop
      if (topDomModal.classList.contains('fixed') && topDomModal.classList.contains('inset-0')) {
        topDomModal.click();
        return true;
      }
    }

    return false;
  }, []);

  // Global Escape key listener to close top-most modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'Escape') {
        if (modalStackRef.current.length > 0 || document.querySelector('[role="dialog"], .fixed.inset-0.z-50')) {
          e.preventDefault();
          e.stopPropagation();
          closeTopModal();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [closeTopModal]);

  return (
    <ModalContext.Provider
      value={{
        registerModal,
        closeTopModal,
        hasOpenModal: openModalCount > 0,
        openModalCount,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
};

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}

/**
 * Hook to automatically register an active modal to the back navigation & Escape stack.
 * When `isOpen` is true, pressing the device back button or Escape key will invoke `onClose`.
 */
export function useRegisterModal(isOpen: boolean, onClose: () => void, modalId?: string) {
  const { registerModal } = useModal();
  const idRef = useRef(modalId || `modal-${Math.random().toString(36).slice(2, 9)}`);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    const unregister = registerModal(idRef.current, () => {
      if (onCloseRef.current) {
        onCloseRef.current();
      }
    });

    return () => {
      unregister();
    };
  }, [isOpen, registerModal]);
}

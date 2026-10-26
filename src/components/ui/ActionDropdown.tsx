import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';
import {
  calculateMenuPosition,
  DEFAULT_MENU_WIDTH,
  DEFAULT_MENU_HEIGHT,
  type CalculatedMenuPosition,
  type MenuAlignment,
} from './actionMenuPosition';

export interface ActionDropdownProps {
  /** Whether the dropdown popover is currently open */
  isOpen: boolean;
  /** Callback fired when the popover requests to be closed */
  onClose: () => void;
  /** Optional custom trigger node. If omitted, a standard accessible ••• button is rendered */
  trigger?: ReactNode;
  /** Aria label for the default trigger button */
  triggerAriaLabel?: string;
  /** Extra CSS classes for the default trigger button */
  triggerClassName?: string;
  /** Callback when the default trigger button is clicked */
  onToggle?: () => void;
  /** Estimated or fixed width in px (default: 144px / w-36) */
  menuWidth?: number;
  /** Estimated initial height in px (default: 120px) */
  menuHeight?: number;
  /** Additional CSS classes for the floating menu container */
  className?: string;
  /** Preferred horizontal alignment relative to trigger ('right' | 'left', default: 'right') */
  align?: MenuAlignment;
  /** Accessible label for the menu container */
  ariaLabel?: string;
  /** Custom z-index for the floating menu (default: 9999) */
  zIndex?: number;
  /** Menu content or render callback with close helper */
  children: ReactNode | ((helpers: { close: () => void }) => ReactNode);
}

export const ActionDropdown: React.FC<ActionDropdownProps> = ({
  isOpen,
  onClose,
  trigger,
  triggerAriaLabel = 'Actions',
  triggerClassName,
  onToggle,
  menuWidth = DEFAULT_MENU_WIDTH,
  menuHeight = DEFAULT_MENU_HEIGHT,
  className = '',
  align = 'right',
  ariaLabel = 'Actions menu',
  zIndex = 9999,
  children,
}) => {
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [position, setPosition] = useState<CalculatedMenuPosition>({
    top: 0,
    left: 0,
    placement: 'bottom',
    isOffscreen: false,
  });

  // Calculate coordinates with automatic flip and edge boundaries
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const actualWidth = menuRef.current?.offsetWidth || menuWidth;
    const actualHeight = menuRef.current?.offsetHeight || menuHeight;

    const calculated = calculateMenuPosition(
      rect,
      {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      actualWidth,
      actualHeight,
      8, // 8px margin from viewport edges
      4, // 4px gap from trigger
      align
    );

    if (calculated.isOffscreen) {
      onClose();
      return;
    }

    setPosition(calculated);
  }, [align, menuHeight, menuWidth, onClose]);

  // Update position on open and subscribe to scroll / resize
  useLayoutEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('resize', handleScrollOrResize);
    // Capture phase true listens to scroll events inside overflow containers (like tables)
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, updatePosition]);

  // Click outside and Escape key handling
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      const isInsideMenu = menuRef.current?.contains(target);
      const isInsideTrigger = triggerRef.current?.contains(target);

      if (!isInsideMenu && !isInsideTrigger) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        // Return focus to the trigger button
        const button = triggerRef.current?.querySelector<HTMLButtonElement>('button');
        button?.focus();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Auto-focus first interactive item inside menu on open
  useEffect(() => {
    if (!isOpen) return;

    const focusTimer = requestAnimationFrame(() => {
      const firstInteractive = menuRef.current?.querySelector<HTMLElement>(
        'button:not([disabled]), a[href]:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      firstInteractive?.focus();
    });

    return () => cancelAnimationFrame(focusTimer);
  }, [isOpen]);

  // Keyboard navigation within the menu (ArrowDown, ArrowUp, Home, End, Tab)
  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href]:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ) || []
    );

    if (!items.length) return;

    const currentIndex = items.indexOf(document.activeElement as HTMLElement);

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex = currentIndex + 1 < items.length ? currentIndex + 1 : 0;
      items[nextIndex]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prevIndex = currentIndex - 1 >= 0 ? currentIndex - 1 : items.length - 1;
      items[prevIndex]?.focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      items[items.length - 1]?.focus();
    } else if (event.key === 'Tab') {
      onClose();
    }
  };

  const menuDropdown =
    isOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={ariaLabel}
            aria-orientation="vertical"
            tabIndex={-1}
            onKeyDown={handleMenuKeyDown}
            style={{
              position: 'fixed',
              top: `${position.top}px`,
              left: `${position.left}px`,
              zIndex,
            }}
            className={`rounded-xl border border-[#E2E8F0] bg-white py-1 shadow-lg text-left outline-none ${
              className || 'w-36'
            }`}
          >
            {typeof children === 'function' ? children({ close: onClose }) : children}
          </div>,
          document.body
        )
      : null;

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex items-center shrink-0 text-left"
      onClick={(e) => e.stopPropagation()}
    >
      {trigger ? (
        trigger
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onToggle) {
              onToggle();
            } else if (isOpen) {
              onClose();
            }
          }}
          className={
            triggerClassName ||
            'p-1.5 rounded-lg text-[#94A3B8] hover:text-[#1E1B4B] hover:bg-slate-100 transition-colors cursor-pointer'
          }
          aria-label={triggerAriaLabel}
          aria-expanded={isOpen}
          aria-haspopup="menu"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      )}

      {menuDropdown}
    </div>
  );
};

export interface ActionDropdownItemProps {
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  variant?: 'default' | 'danger';
  disabled?: boolean;
  children: ReactNode;
}

export const ActionDropdownItem: React.FC<ActionDropdownItemProps> = ({
  onClick,
  className = '',
  variant = 'default',
  disabled = false,
  children,
}) => {
  const baseClasses =
    'w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
  const variantClasses =
    variant === 'danger'
      ? 'text-red-600 hover:bg-red-50 hover:text-red-700'
      : 'text-[#1E1B4B] hover:bg-[#F5F3FF] hover:text-[#6D28D9]';

  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={`${baseClasses} ${variantClasses} ${className}`}
    >
      {children}
    </button>
  );
};

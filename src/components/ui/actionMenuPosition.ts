export const DEFAULT_MENU_WIDTH = 144; // w-36 (9rem = 144px)
export const DEFAULT_MENU_HEIGHT = 120; // Default estimate for 2-3 items

export interface TriggerRect {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface ViewportDimensions {
  width: number;
  height: number;
}

export interface CalculatedMenuPosition {
  top: number;
  left: number;
  placement: 'bottom' | 'top';
  isOffscreen: boolean;
}

export type MenuAlignment = 'right' | 'left';

/**
 * Calculates optimal fixed position for the floating action menu popover.
 * - Positions below the trigger aligned to the right edge by default (or left if specified).
 * - Automatically flips above when space below is insufficient.
 * - Constrains to viewport boundaries.
 * - Detects if trigger has scrolled off-screen.
 */
export function calculateMenuPosition(
  rect: TriggerRect,
  viewport: ViewportDimensions,
  menuWidth = DEFAULT_MENU_WIDTH,
  menuHeight = DEFAULT_MENU_HEIGHT,
  margin = 8,
  gap = 4,
  align: MenuAlignment = 'right'
): CalculatedMenuPosition {
  // Check if trigger is scrolled completely out of view
  if (
    rect.bottom < 0 ||
    rect.top > viewport.height ||
    rect.right < 0 ||
    rect.left > viewport.width
  ) {
    return {
      top: 0,
      left: 0,
      placement: 'bottom',
      isOffscreen: true,
    };
  }

  // Horizontal position
  let left = align === 'left' ? rect.left : rect.right - menuWidth;

  // Viewport horizontal clamping
  if (left + menuWidth + margin > viewport.width) {
    left = viewport.width - menuWidth - margin;
  }
  if (left < margin) {
    left = margin;
  }

  // Vertical calculation
  const spaceBelow = viewport.height - (rect.bottom + gap + margin);
  const spaceAbove = rect.top - gap - margin;

  let top = rect.bottom + gap;
  let placement: 'bottom' | 'top' = 'bottom';

  // If menu overflows the bottom, check if it fits above or has more space above
  const overflowsBottom = spaceBelow < menuHeight;
  const fitsAbove = spaceAbove >= menuHeight;

  if (overflowsBottom && (fitsAbove || spaceAbove > spaceBelow)) {
    top = Math.max(margin, rect.top - menuHeight - gap);
    placement = 'top';
  }

  // Clamp within viewport vertical boundaries
  top = Math.max(margin, Math.min(top, viewport.height - menuHeight - margin));

  return {
    top: Math.round(top),
    left: Math.round(left),
    placement,
    isOffscreen: false,
  };
}

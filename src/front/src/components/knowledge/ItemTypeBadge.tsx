'use client';

import { getItemTypeStyle } from '../../utils/itemTypeStyles';

interface ItemTypeBadgeProps {
  itemType: string;
}

export function ItemTypeBadge({ itemType }: ItemTypeBadgeProps) {
  const style = getItemTypeStyle(itemType);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${style.bgColor} ${style.color}`}
    >
      <span>{style.icon}</span>
      <span>{itemType.charAt(0).toUpperCase() + itemType.slice(1)}</span>
    </span>
  );
}

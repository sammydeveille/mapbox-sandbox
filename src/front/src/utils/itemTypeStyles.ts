export interface ItemTypeStyle {
  color: string;
  bgColor: string;
  icon: string;
  mapColor: string;
  mapPattern: 'solid' | 'striped' | 'dotted';
}

const ITEM_TYPE_STYLES: Record<string, ItemTypeStyle> = {
  article: { color: 'text-blue-700', bgColor: 'bg-blue-100', icon: '📄', mapColor: '#3b82f6', mapPattern: 'solid' },
  event: { color: 'text-amber-700', bgColor: 'bg-amber-100', icon: '📅', mapColor: '#f59e0b', mapPattern: 'solid' },
  statistic: { color: 'text-green-700', bgColor: 'bg-green-100', icon: '📊', mapColor: '#10b981', mapPattern: 'striped' },
  concept: { color: 'text-purple-700', bgColor: 'bg-purple-100', icon: '💡', mapColor: '#8b5cf6', mapPattern: 'dotted' },
  place: { color: 'text-rose-700', bgColor: 'bg-rose-100', icon: '📍', mapColor: '#f43f5e', mapPattern: 'solid' },
};

const DEFAULT_STYLE: ItemTypeStyle = {
  color: 'text-gray-700',
  bgColor: 'bg-gray-100',
  icon: '📎',
  mapColor: '#6b7280',
  mapPattern: 'solid',
};

export function getItemTypeStyle(itemType: string): ItemTypeStyle {
  return ITEM_TYPE_STYLES[itemType] ?? DEFAULT_STYLE;
}

export const ITEM_TYPES = Object.keys(ITEM_TYPE_STYLES);

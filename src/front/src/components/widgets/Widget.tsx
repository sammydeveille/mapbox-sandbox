import { useState, ReactNode } from 'react';

interface WidgetProps {
  title: string;
  icon?: string;
  children: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export function Widget({ title, icon, children, collapsible = false, defaultOpen = false }: WidgetProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={collapsible ? '' : 'bg-bg-secondary p-4 rounded-lg'}>
      {collapsible ? (
        <div className="border-t border-gray-300 dark:border-gray-600 pt-2 mt-2">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full text-left font-semibold text-sm flex justify-between items-center"
          >
            {icon && `${icon} `}{title}
            <span>{isOpen ? '▼' : '▶'}</span>
          </button>
          {isOpen && <div className="mt-2 text-sm space-y-1">{children}</div>}
        </div>
      ) : (
        <>
          <h2 className="font-semibold mb-2">{icon && `${icon} `}{title}</h2>
          <div className="text-sm space-y-1">{children}</div>
        </>
      )}
    </div>
  );
}

interface WidgetItemProps {
  label?: string;
  value: string | number;
  format?: (val: any) => string;
}

export function WidgetItem({ label, value, format }: WidgetItemProps) {
  const displayValue = format ? format(value) : value;
  return <div>{label ? `${label}: ${displayValue}` : displayValue}</div>;
}

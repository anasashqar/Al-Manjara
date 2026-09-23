import React from 'react';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  width?: string;
  align?: 'right' | 'center' | 'left';
}

interface StickyTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  maxHeight?: string;
}

export function StickyTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = 'لا بيانات',
  maxHeight = 'max-h-[620px]',
}: StickyTableProps<T>) {
  return (
    <div className={`w-full overflow-x-auto rounded-lg border border-slate-200 bg-white ${maxHeight}`}>
      <table className="w-full text-right text-xs sm:text-sm border-collapse">
        <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-xs text-slate-700 font-semibold border-b border-slate-200">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className={`py-3 px-3 sm:px-4 font-semibold whitespace-nowrap ${
                  col.align === 'center'
                    ? 'text-center'
                    : col.align === 'left'
                    ? 'text-left'
                    : 'text-right'
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="py-12 text-center text-slate-400 font-medium"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr
                key={keyExtractor(item)}
                onClick={() => onRowClick?.(item)}
                className={`transition-colors duration-100 ${
                  onRowClick ? 'cursor-pointer hover:bg-slate-50/80' : 'hover:bg-slate-50/40'
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`py-3 px-3 sm:px-4 text-slate-700 whitespace-nowrap ${
                      col.align === 'center'
                        ? 'text-center'
                        : col.align === 'left'
                        ? 'text-left'
                        : 'text-right'
                    }`}
                  >
                    {col.render
                      ? col.render(item)
                      : (item as Record<string, any>)[col.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

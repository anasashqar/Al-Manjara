import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Trash2 } from 'lucide-react';
import { db, addWorkshopNeed, toggleWorkshopNeed, deleteWorkshopNeed } from '../../db/dexie';
import { NEED_CATEGORY_LABELS, type NeedCategory } from '../../types';

type Filter = 'all' | 'pending' | 'done';

// احتياجات المنجرة: ما يلزم شراؤه من أدوات ومواد
export const WorkshopNeedsPanel: React.FC = () => {
  const needs = useLiveQuery(() => db.workshopNeeds.toArray(), []) || [];
  const [filter, setFilter] = useState<Filter>('pending');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<NeedCategory>('tools');
  const [notes, setNotes] = useState('');

  const visible = useMemo(
    () =>
      needs
        .filter((n) => (filter === 'all' ? true : filter === 'done' ? n.isDone : !n.isDone))
        // غير المشتراة أولاً ثم الأحدث
        .sort((a, b) => Number(a.isDone) - Number(b.isDone) || b.addedAt - a.addedAt),
    [needs, filter]
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await addWorkshopNeed({ title, category, notes });
    setTitle('');
    setNotes('');
  };

  const filters: { id: Filter; label: string }[] = [
    { id: 'pending', label: 'للشراء' },
    { id: 'done', label: 'تم الشراء' },
    { id: 'all', label: 'الكل' },
  ];

  const inputCls =
    'h-8 px-2.5 text-xs sm:text-sm rounded-[4px] border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#166534] bg-white text-slate-900';

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3 max-w-6xl w-full mx-auto">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 bg-white p-2.5 rounded-[4px] border border-slate-300 shadow-2xs">
        <div className="flex items-center gap-1 select-none">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`h-8 px-4 rounded-[6px] text-xs sm:text-sm font-semibold transition-colors ${
                filter === f.id ? 'bg-[#166534] text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleAdd} className="flex flex-wrap items-center gap-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="البند" required className={`${inputCls} flex-1 min-w-32`} />
          <select value={category} onChange={(e) => setCategory(e.target.value as NeedCategory)} className={inputCls}>
            {Object.entries(NEED_CATEGORY_LABELS).map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظات" className={`${inputCls} w-32`} />
          <button
            type="submit"
            className="h-8 inline-flex items-center gap-1.5 px-4 rounded-[6px] bg-[#166534] hover:bg-[#14532d] text-white text-xs sm:text-sm font-semibold transition-colors shadow-xs whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة</span>
          </button>
        </form>
      </div>

      <div className="min-h-0 overflow-auto bg-white rounded-[4px] border border-slate-300 shadow-2xs">
        <table className="w-full text-right text-xs sm:text-sm border-collapse">
          <thead className="sticky top-0 z-10 bg-[#e9f0eb] text-slate-900 font-bold border-b-2 border-[#d2dfd6]">
            <tr>
              <th className="py-2.5 px-3 text-center border-l border-[#d2dfd6]/60 w-10">✓</th>
              <th className="py-2.5 px-3 border-l border-[#d2dfd6]/60">البند</th>
              <th className="py-2.5 px-3 border-l border-[#d2dfd6]/60 w-28 text-center">التصنيف</th>
              <th className="py-2.5 px-3 border-l border-[#d2dfd6]/60">ملاحظات</th>
              <th className="py-2.5 px-3 w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">لا بنود</td>
              </tr>
            ) : (
              visible.map((n) => (
                <tr key={n.id} className={n.isDone ? 'bg-slate-50 text-slate-400' : 'hover:bg-slate-50/60'}>
                  <td className="py-2.5 px-3 text-center border-l border-slate-200">
                    <input
                      type="checkbox"
                      checked={n.isDone}
                      onChange={(e) => toggleWorkshopNeed(n.id, e.target.checked)}
                      className="w-4 h-4 accent-[#166534] cursor-pointer"
                    />
                  </td>
                  <td className={`py-2.5 px-3 border-l border-slate-200 font-semibold ${n.isDone ? 'line-through' : 'text-slate-900'}`}>
                    {n.title}
                  </td>
                  <td className="py-2.5 px-3 border-l border-slate-200 text-center">{NEED_CATEGORY_LABELS[n.category]}</td>
                  <td className="py-2.5 px-3 border-l border-slate-200 text-slate-500">{n.notes || '—'}</td>
                  <td className="py-2 px-2 text-center">
                    <button
                      type="button"
                      onClick={() => deleteWorkshopNeed(n.id)}
                      title="حذف"
                      className="h-7 w-7 inline-flex items-center justify-center rounded-[6px] border border-slate-300 text-slate-400 hover:text-[#b91c1c] hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

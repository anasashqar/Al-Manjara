import React, { useEffect, useRef, useState } from 'react';
import { compact, num, plain } from '../../utils/format';
import { MONTHS_AR } from '../../utils/period';
import type { BreakdownRow } from '../../utils/finance';

// لونان من اللوحة المرجعية، اجتازا فحص عمى الألوان والتباين
const IN_COLOR = '#2a78d6';
const OUT_COLOR = '#eb6834';

const HEIGHT = 220;
const M = { top: 12, bottom: 28, right: 56, left: 8 }; // اليمين لتسميات المحور (RTL)

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

function niceStep(raw: number): number {
  const power = 10 ** Math.floor(Math.log10(raw));
  const n = raw / power;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * power;
}

// عمود بطرف علوي مدور 4px وقاعدة مستقيمة
function barPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(4, h, w / 2);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

interface CashflowChartProps {
  rows: BreakdownRow[];
  onSelect: (row: BreakdownRow) => void;
}

export const CashflowChart: React.FC<CashflowChartProps> = ({ rows, onSelect }) => {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const max = Math.max(0, ...rows.map((r) => Math.max(r.collected, r.expenses)));
  const step = max > 0 ? niceStep(max / 4) : 1;
  const top = step * Math.max(1, Math.ceil(max / step));
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);

  const plotW = Math.max(0, width - M.left - M.right);
  const plotH = HEIGHT - M.top - M.bottom;
  const band = rows.length ? plotW / rows.length : 0;
  const barW = Math.max(4, Math.min(20, (band - 14) / 2));
  const y = (v: number) => M.top + plotH - (v / top) * plotH;
  // RTL: أول عنصر على اليمين
  const center = (i: number) => M.left + plotW - (i + 0.5) * band;
  const shortLabels = band < 56;
  const labelOf = (r: BreakdownRow) =>
    r.month === null ? plain(r.year) : shortLabels ? plain(r.month) : MONTHS_AR[r.month - 1];

  const hovered = hover !== null ? rows[hover] : null;

  return (
    <div ref={ref} className="relative select-none" style={{ height: HEIGHT }}>
      {width > 0 && (
        <>
          <svg width={width} height={HEIGHT} className="absolute inset-0" aria-hidden="true">
            {ticks.map((t) => (
              <line
                key={t}
                x1={M.left}
                x2={M.left + plotW}
                y1={y(t)}
                y2={y(t)}
                stroke={t === 0 ? '#cbd5e1' : '#eef2f6'}
                strokeWidth={1}
              />
            ))}
            {rows.map((r, i) => {
              const cx = center(i);
              const hIn = M.top + plotH - y(r.collected);
              const hOut = M.top + plotH - y(r.expenses);
              return (
                <g key={r.key}>
                  {hover === i && (
                    <rect x={cx - band / 2 + 2} y={M.top} width={band - 4} height={plotH} fill="#f1f5f9" rx={4} />
                  )}
                  {r.collected > 0 && <path d={barPath(cx + 1, y(r.collected), barW, hIn)} fill={IN_COLOR} />}
                  {r.expenses > 0 && <path d={barPath(cx - 1 - barW, y(r.expenses), barW, hOut)} fill={OUT_COLOR} />}
                </g>
              );
            })}
          </svg>

          {/* تسميات المحور الرأسي */}
          {ticks.map((t) => (
            <div
              key={t}
              className="absolute right-0 text-[11px] text-slate-500 tabular-nums leading-none -translate-y-1/2"
              style={{ top: y(t), width: M.right - 8 }}
            >
              {compact(t)}
            </div>
          ))}

          {/* الأشهر/السنوات + مناطق التفاعل */}
          {rows.map((r, i) => (
            <button
              key={r.key}
              type="button"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              onClick={() => onSelect(r)}
              className="absolute flex items-end justify-center pb-1 text-[11px] text-slate-600 focus:outline-none"
              style={{ left: center(i) - band / 2, width: band, top: M.top, height: HEIGHT - M.top }}
              aria-label={`${labelOf(r)}: مقبوضات ${num(r.collected)}، مصاريف ${num(r.expenses)}`}
            >
              {labelOf(r)}
            </button>
          ))}

          {hovered && hover !== null && (
            <div
              className="absolute z-10 pointer-events-none bg-white border border-slate-200 rounded-[6px] shadow-md px-3 py-2 text-xs min-w-[150px]"
              style={{
                top: 4,
                left: Math.min(Math.max(center(hover) - 75, 0), Math.max(0, width - 160)),
              }}
            >
              <div className="font-bold text-slate-900 mb-1">
                {hovered.month === null ? plain(hovered.year) : `${MONTHS_AR[hovered.month - 1]} ${plain(hovered.year)}`}
              </div>
              <TooltipRow color={IN_COLOR} label="المقبوضات" value={hovered.collected} />
              <TooltipRow color={OUT_COLOR} label="المصاريف" value={hovered.expenses} />
              <div className="flex justify-between gap-4 border-t border-slate-100 mt-1 pt-1 font-bold text-slate-900">
                <span>الصافي</span>
                <span className="tabular-nums">{num(hovered.net)}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const TooltipRow: React.FC<{ color: string; label: string; value: number }> = ({ color, label, value }) => (
  <div className="flex justify-between gap-4 text-slate-700">
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-[2px]" style={{ background: color }} />
      {label}
    </span>
    <span className="tabular-nums">{num(value)}</span>
  </div>
);

export const ChartLegend: React.FC = () => (
  <div className="flex items-center gap-3 text-xs text-slate-600">
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-[2px]" style={{ background: IN_COLOR }} />
      المقبوضات
    </span>
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-[2px]" style={{ background: OUT_COLOR }} />
      المصاريف
    </span>
  </div>
);

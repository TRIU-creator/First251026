import React, { useState } from 'react';

interface ReceiptsByWarehouseProps {
  data: { name: string; code: string; count: number; totalQty: number }[];
}

export const ReceiptsByWarehouseChart: React.FC<ReceiptsByWarehouseProps> = ({ data }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (data.length === 0) {
    return <div className="text-center py-10 text-xs text-slate-400">No warehouse receipts data</div>;
  }

  const maxVal = Math.max(...data.map((d) => d.count), 1);
  const chartHeight = 180;

  return (
    <div className="space-y-4">
      <div className="relative h-[200px] flex items-end justify-around pt-6 px-4 border-b border-slate-200">
        {/* Subtle grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
          <div className="border-b border-slate-300 w-full"></div>
          <div className="border-b border-slate-300 w-full"></div>
          <div className="border-b border-slate-300 w-full"></div>
        </div>

        {data.map((item, idx) => {
          const heightPercent = Math.max(12, (item.count / maxVal) * 100);
          const isHovered = hoveredIdx === idx;

          return (
            <div
              key={item.code}
              className="flex-1 flex flex-col items-center max-w-[80px] group cursor-pointer"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Tooltip */}
              {isHovered && (
                <div className="absolute -top-1 bg-slate-900 text-white text-[11px] py-1 px-2.5 rounded shadow-lg pointer-events-none z-10 whitespace-nowrap animate-in fade-in duration-100">
                  <span className="font-semibold">{item.name}</span>: {item.count} receipts ({item.totalQty} units)
                </div>
              )}

              <div className="w-full flex justify-center items-end" style={{ height: `${chartHeight}px` }}>
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-10 rounded-t-md transition-all duration-200 flex flex-col justify-start items-center pt-1.5 ${
                    isHovered
                      ? 'bg-indigo-600 shadow-md ring-2 ring-indigo-400/50'
                      : 'bg-indigo-500/85 hover:bg-indigo-600'
                  }`}
                >
                  <span className="text-[11px] font-mono font-bold text-white drop-shadow-xs">
                    {item.count}
                  </span>
                </div>
              </div>

              <div className="mt-2 text-center">
                <span className="block text-[11px] font-medium text-slate-700 truncate max-w-[70px]">
                  {item.code.replace('WH-', '')}
                </span>
                <span className="block text-[10px] text-slate-400 truncate max-w-[70px]">
                  {item.name.split(' ')[0]}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface ConditionDonutProps {
  results: { result: string; count: number }[];
}

export const ConditionOutcomesChart: React.FC<ConditionDonutProps> = ({ results }) => {
  const total = results.reduce((sum, r) => sum + r.count, 0);

  const colors: Record<string, string> = {
    PASS: '#10b981', // emerald
    FAIL: '#ef4444', // rose
    REWORK: '#f59e0b', // amber
    REJECT: '#b91c1c' // red dark
  };

  if (total === 0) {
    return <div className="text-center py-10 text-xs text-slate-400">No condition check records logged</div>;
  }

  // Calculate SVG donut slice offsets
  let cumulative = 0;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
      <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} className="stroke-slate-100 fill-none" strokeWidth="12" />
          {results.map((item) => {
            const fraction = item.count / total;
            const strokeDasharray = `${fraction * circumference} ${circumference}`;
            const strokeDashoffset = -cumulative * circumference;
            cumulative += fraction;

            return (
              <circle
                key={item.result}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={colors[item.result] || '#64748b'}
                strokeWidth="12"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-300 hover:opacity-90 cursor-pointer"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold font-mono text-slate-900">{total}</span>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">Checks</span>
        </div>
      </div>

      <div className="space-y-2 w-full max-w-[180px]">
        {results.map((item) => {
          const pct = Math.round((item.count / total) * 100);
          return (
            <div key={item.result} className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <span
                  className="w-2.5 h-2.5 rounded-xs shrink-0"
                  style={{ backgroundColor: colors[item.result] || '#64748b' }}
                />
                <span className="font-medium text-slate-700">{item.result}</span>
              </div>
              <div className="flex items-center space-x-2 font-mono text-slate-500">
                <span>{item.count}</span>
                <span className="text-[11px] text-slate-400">({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

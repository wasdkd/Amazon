import React from 'react';
import { TableData, Mergeinfo } from '../lib/excelHelper';
import { cn } from '../lib/utils';

interface ExcelTableProps {
  data: TableData;
  merges: Mergeinfo[];
  theme: 'professional' | 'modern' | 'minimal';
  colorColumnIndex: number;
}

export const ExcelTable: React.FC<ExcelTableProps> = ({ data, merges, theme, colorColumnIndex }) => {
  if (!data.headers.length) return null;

  // Map to store which cells are "hidden" by a rowSpan merge
  const hiddenCells = new Set<string>();
  const rowSpans = new Map<string, number>();

  merges.forEach(m => {
    const startR = m.s.r - 1; 
    const endR = m.e.r - 1;
    const col = m.s.c;

    rowSpans.set(`${startR}-${col}`, endR - startR + 1);
    for (let r = startR + 1; r <= endR; r++) {
      hiddenCells.add(`${r}-${col}`);
    }
  });

  // Calculate hierarchical group colors based on colorColumnIndex and its ancestors
  const rowGroupIndex = new Array(data.rows.length).fill(0);
  let currentGroup = 0;
  for (let r = 1; r < data.rows.length; r++) {
    let hasChanged = false;
    for (let c = 0; c <= colorColumnIndex; c++) {
      if (data.rows[r][c] !== data.rows[r - 1][c]) {
        hasChanged = true;
        break;
      }
    }
    if (hasChanged) {
      currentGroup++;
    }
    rowGroupIndex[r] = currentGroup;
  }

  const headerBg = theme === 'professional' ? 'bg-[#1F4E78]' : theme === 'modern' ? 'bg-[#2E75B6]' : 'bg-zinc-800';

  return (
    <div className="overflow-auto border border-zinc-200 rounded-lg shadow-sm max-h-[70vh] bg-white">
      <table className="w-full text-sm border-collapse table-fixed min-w-[800px]">
        <thead className={cn("sticky top-0 z-10 text-white", headerBg)}>
          <tr>
            {data.headers.map((header, i) => (
              <th 
                key={i} 
                className="px-4 py-3 font-semibold border border-zinc-300 text-left whitespace-normal break-words"
                style={{ width: 'auto', minWidth: '120px' }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200">
          {data.rows.map((row, rIndex) => {
            const isEvenGroup = rowGroupIndex[rIndex] % 2 === 0;
            const groupBg = isEvenGroup ? "bg-white" : "bg-emerald-50/40";
            const rowAltBg = rIndex % 2 === 1 ? "bg-zinc-50/20" : "";

            return (
              <tr 
                key={rIndex} 
                className={cn(rowAltBg, "hover:bg-emerald-100/20 transition-colors")}
              >
                {row.map((cell, cIndex) => {
                  const key = `${rIndex}-${cIndex}`;
                  if (hiddenCells.has(key)) return null;

                  const rowSpan = rowSpans.get(key) || 1;
                  const isColorZone = cIndex >= colorColumnIndex;
                  
                  return (
                    <td
                      key={cIndex}
                      rowSpan={rowSpan}
                      className={cn(
                        "px-4 py-2 border border-zinc-200 whitespace-normal break-words overflow-hidden",
                        rowSpan > 1 ? "text-center font-medium font-serif italic" : "text-left",
                        (!isEvenGroup && isColorZone) ? "bg-emerald-50/40" : "bg-transparent"
                      )}
                    >
                      {String(cell ?? '')}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

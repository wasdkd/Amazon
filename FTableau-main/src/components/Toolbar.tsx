/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BarChart, LineChart, PieChart, ScatterChart, AreaChart } from 'lucide-react';
import { ChartType } from '../types';
import { cn } from '../lib/utils'; // I'll create this later

interface ToolbarProps {
  currentType: ChartType;
  onTypeChange: (type: ChartType) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ currentType, onTypeChange }) => {
  const types: { type: ChartType; icon: React.ReactNode; label: string }[] = [
    { type: 'bar', icon: <BarChart size={16} />, label: '柱状图' },
    { type: 'line', icon: <LineChart size={16} />, label: '折线图' },
    { type: 'area', icon: <AreaChart size={16} />, label: '面积图' },
    { type: 'scatter', icon: <ScatterChart size={16} />, label: '散点图' },
    { type: 'pie', icon: <PieChart size={16} />, label: '饼图' },
  ];

  return (
    <div className="flex border border-slate-200 rounded bg-white overflow-hidden text-[11px]">
      {types.map(({ type, icon, label }) => (
        <button
          key={type}
          onClick={() => onTypeChange(type)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 transition-all outline-none border-l border-slate-200 first:border-l-0",
            currentType === type 
              ? 'bg-slate-100 text-slate-900 font-bold' 
              : 'text-slate-500 hover:bg-slate-50'
          )}
          title={label}
        >
          {React.cloneElement(icon as React.ReactElement, { size: 14 })}
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
};

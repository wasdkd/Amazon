/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Type, Hash, Calendar, Layers } from 'lucide-react';
import { DataField } from '../types';

interface SidebarProps {
  fields: DataField[];
  onDragStart: (field: DataField) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ fields, onDragStart }) => {
  const dimensions = fields.filter(f => !f.isMeasure);
  const measures = fields.filter(f => f.isMeasure);

  const getIcon = (type: string) => {
    switch (type) {
      case 'number': return <Hash size={14} className="text-blue-500" />;
      case 'date': return <Calendar size={14} className="text-orange-500" />;
      default: return <Type size={14} className="text-gray-500" />;
    }
  };

  const FieldItem = ({ field }: { field: DataField }) => (
    <div
      draggable
      onDragStart={() => onDragStart(field)}
      className="field-chip bg-white border border-gray-200 shadow-sm hover:border-blue-400 hover:shadow-md transition-all mb-1 group"
    >
      {getIcon(field.type)}
      <span className="truncate">{field.name}</span>
    </div>
  );

  return (
    <div className="w-60 h-full flex-shrink-0 technical-border-r bg-white flex flex-col overflow-hidden">
      <div className="p-4 border-b border-slate-100 shrink-0">
        <h3 className="technical-header">数据源</h3>
        <div className="flex items-center gap-2 text-sm font-medium text-blue-600 bg-blue-50 p-2 rounded">
          <Layers size={14} />
          <span className="truncate">活动数据源</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        <div className="space-y-2">
          <h3 className="technical-header font-bold text-slate-500 mb-2">维度</h3>
          <ul className="space-y-1">
            {dimensions.map(f => (
              <li 
                key={f.name}
                draggable
                onDragStart={() => onDragStart(f)}
                className="flex items-center gap-2 p-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded cursor-pointer transition-colors group border border-transparent hover:border-slate-200"
              >
                {getIcon(f.type)}
                <span className="truncate">{f.name}</span>
              </li>
            ))}
            {dimensions.length === 0 && <p className="text-[10px] text-slate-400 italic">无维度</p>}
          </ul>
        </div>

        <div className="space-y-2">
          <h3 className="technical-header font-bold text-slate-500 mb-2">指标</h3>
          <ul className="space-y-1">
            {measures.map(f => (
              <li 
                key={f.name}
                draggable
                onDragStart={() => onDragStart(f)}
                className="flex items-center gap-2 p-1.5 text-sm text-green-700 font-medium hover:bg-slate-100 rounded cursor-pointer transition-colors group border border-transparent hover:border-slate-200"
              >
                {getIcon(f.type)}
                <span className="truncate">{f.name}</span>
              </li>
            ))}
            {measures.length === 0 && <p className="text-[10px] text-slate-400 italic">无指标</p>}
          </ul>
        </div>
      </div>
    </div>
  );
};

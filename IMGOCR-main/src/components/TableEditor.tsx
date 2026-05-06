import React from 'react';
import { TableData } from '../services/gemini';
import { RotateCcw, Plus, Trash2 } from 'lucide-react';

interface TableEditorProps {
  data: TableData;
  onChange: (newData: TableData) => void;
  onTranspose: () => void;
}

export const TableEditor: React.FC<TableEditorProps> = ({ data, onChange, onTranspose }) => {
  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const newRows = [...data.rows];
    newRows[rowIndex] = [...newRows[rowIndex]];
    newRows[rowIndex][colIndex] = value;
    onChange({ ...data, rows: newRows });
  };

  const updateHeader = (colIndex: number, value: string) => {
    const newHeaders = [...data.headers];
    newHeaders[colIndex] = value;
    onChange({ ...data, headers: newHeaders });
  };

  const addRow = () => {
    const newRow = new Array(data.headers.length).fill('');
    onChange({ ...data, rows: [...data.rows, newRow] });
  };

  const addColumn = () => {
    const newHeaders = [...data.headers, `Column ${data.headers.length + 1}`];
    const newRows = data.rows.map(row => [...row, '']);
    onChange({ ...data, headers: newHeaders, rows: newRows });
  };

  const removeRow = (index: number) => {
    const newRows = data.rows.filter((_, i) => i !== index);
    onChange({ ...data, rows: newRows });
  };

  const removeColumn = (index: number) => {
    const newHeaders = data.headers.filter((_, i) => i !== index);
    const newRows = data.rows.map(row => row.filter((_, i) => i !== index));
    onChange({ ...data, headers: newHeaders, rows: newRows });
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex justify-between items-center bg-zinc-50 p-4 border border-zinc-200 rounded-lg">
        <h3 className="font-semibold text-zinc-900">Table Editor</h3>
        <div className="flex space-x-2">
          <button 
            onClick={onTranspose}
            className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-zinc-200 rounded-md text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm"
          >
            <RotateCcw size={14} />
            <span>Transpose</span>
          </button>
          <button 
            onClick={addColumn}
            className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-zinc-200 rounded-md text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm"
          >
            <Plus size={14} />
            <span>Add Column</span>
          </button>
          <button 
            onClick={addRow}
            className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-zinc-200 rounded-md text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm"
          >
            <Plus size={14} />
            <span>Add Row</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-zinc-200 rounded-lg shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-zinc-100 border-b border-zinc-200">
              <th className="p-2 w-10"></th>
              {data.headers.map((header, i) => (
                <th key={i} className="p-2 border-r border-zinc-200 relative group">
                  <input
                    value={header}
                    onChange={(e) => updateHeader(i, e.target.value)}
                    className="w-full bg-transparent focus:outline-none font-bold text-center italic-serif text-xs uppercase tracking-wider"
                    placeholder="Header"
                  />
                  <button 
                    onClick={() => removeColumn(i)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={10} />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-zinc-200">
            {data.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-zinc-50 transition-colors">
                <td className="p-2 bg-zinc-50 border-r border-zinc-200 text-center text-zinc-400 group relative">
                  {rowIndex + 1}
                  <button 
                    onClick={() => removeRow(rowIndex)}
                    className="absolute left-1/2 -translate-x-1/2 -top-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={10} />
                  </button>
                </td>
                {row.map((cell, colIndex) => (
                  <td key={colIndex} className="p-2 border-r border-zinc-200">
                    <input
                      value={cell}
                      onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                      className="w-full bg-transparent focus:outline-none font-mono text-xs"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

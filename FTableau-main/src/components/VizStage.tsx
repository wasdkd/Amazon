/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell, PieChart, Pie, AreaChart, Area,
  BarChart, Bar, 
  LineChart, Line, 
  ScatterChart, Scatter,
  Brush,
  LabelList
} from 'recharts';
import { BarChart2 } from 'lucide-react';
import { ChartConfig, Dataset, AggregationType } from '../types';

interface VizStageProps {
  dataset: Dataset;
  config: ChartConfig;
}

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export const VizStage: React.FC<VizStageProps> = ({ dataset, config }) => {
  if (config.xAxis.length === 0 || config.yAxis.length === 0 || !dataset.data.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4 h-full">
        <BarChart2 size={48} className="opacity-10" />
        <p className="text-sm font-medium">拖拽字段到上方槽位进行可视化</p>
      </div>
    );
  }

  // Data Aggregation Logic
  const processData = () => {
    const { xAxis, yAxis, aggregation, sort, filters } = config;
    
    // Apply filters
    const filteredData = dataset.data.filter(row => {
      return Object.entries(filters).every(([field, selectedValues]) => {
        if (!selectedValues || selectedValues.length === 0) return true;
        const val = String(row[field]);
        return selectedValues.includes(val);
      });
    });

    const groupedData: Record<string, any> = {};

    filteredData.forEach(row => {
      // Create a composite key for multiple dimensions
      const dimKey = xAxis.map(dim => row[dim] || '未知').join(' / ');
      
      if (!groupedData[dimKey]) {
        groupedData[dimKey] = { _label: dimKey };
        xAxis.forEach(dim => groupedData[dimKey][dim] = row[dim]);
        yAxis.forEach(measure => {
          groupedData[dimKey][measure] = aggregation[measure] === 'count' ? 1 : (Number(row[measure]) || 0);
          groupedData[dimKey][`_${measure}_count`] = 1;
        });
      } else {
        yAxis.forEach(measure => {
          const val = Number(row[measure]) || 0;
          groupedData[dimKey][`_${measure}_count`]++;
          
          switch (aggregation[measure]) {
            case 'sum':
            case 'avg':
              groupedData[dimKey][measure] += val;
              break;
            case 'count':
              groupedData[dimKey][measure]++;
              break;
            case 'min':
              groupedData[dimKey][measure] = Math.min(groupedData[dimKey][measure], val);
              break;
            case 'max':
              groupedData[dimKey][measure] = Math.max(groupedData[dimKey][measure], val);
              break;
          }
        });
      }
    });

    // Finalize averages
    let result = Object.values(groupedData).map(row => {
      yAxis.forEach(measure => {
        if (aggregation[measure] === 'avg') {
          row[measure] = row[measure] / row[`_${measure}_count`];
        }
        // Round for display
        if (typeof row[measure] === 'number') {
          row[measure] = Math.round(row[measure] * 100) / 100;
        }
      });
      return row;
    });

    // Sorting Logic
    if (sort !== 'none') {
      const mainMeasure = yAxis[0];
      result.sort((a, b) => {
        const valA = a[mainMeasure] || 0;
        const valB = b[mainMeasure] || 0;
        return sort === 'asc' ? valA - valB : valB - valA;
      });
    }

    return result;
  };

  const chartData = processData();
  const metrics = config.yAxis;

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 10, bottom: 20 }
    };

    const needsBrush = chartData.length > 15;
    const labelProps = config.showLabels ? {
      content: (props: any) => {
        const { x, y, width, value } = props;
        return (
          <text 
            x={x + width / 2} 
            y={y - 10} 
            fill="#64748b" 
            textAnchor="middle" 
            fontSize={10}
            fontWeight="bold"
          >
            {value}
          </text>
        );
      }
    } : null;

    switch (config.type) {
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="_label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <Tooltip 
              contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', fontSize: '11px' }}
            />
            <Legend verticalAlign="top" height={36} iconType="rect" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}/>
            {metrics.map((metric, idx) => (
              <Bar key={metric} dataKey={metric} fill={COLORS[idx % COLORS.length]} radius={[2, 2, 0, 0]}>
                {config.showLabels && <LabelList dataKey={metric} position="top" style={{ fontSize: '10px', fill: '#64748b', fontWeight: 'bold' }} />}
              </Bar>
            ))}
            {needsBrush && <Brush dataKey="_label" height={20} stroke="#cbd5e1" />}
          </BarChart>
        );
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="_label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', fontSize: '11px' }} />
            <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase' }}/>
            {metrics.map((metric, idx) => (
              <Line 
                key={metric}
                type="monotone" 
                dataKey={metric} 
                stroke={COLORS[idx % COLORS.length]} 
                strokeWidth={2} 
                dot={{ r: 3, fill: '#fff', stroke: COLORS[idx % COLORS.length] }} 
                activeDot={{ r: 5 }} 
              >
                {config.showLabels && <LabelList dataKey={metric} position="top" offset={10} style={{ fontSize: '10px', fill: '#64748b', fontWeight: 'bold' }} />}
              </Line>
            ))}
            {needsBrush && <Brush dataKey="_label" height={20} stroke="#cbd5e1" />}
          </LineChart>
        );
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="_label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', fontSize: '11px' }} />
            <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px' }}/>
            {metrics.map((metric, idx) => (
              <Area 
                key={metric}
                type="monotone" 
                dataKey={metric} 
                stroke={COLORS[idx % COLORS.length]} 
                fill={COLORS[idx % COLORS.length]} 
                fillOpacity={0.1}
              />
            ))}
            {needsBrush && <Brush dataKey="_label" height={20} stroke="#cbd5e1" />}
          </AreaChart>
        );
      case 'scatter':
        return (
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="_label" name="维度" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <YAxis dataKey={metrics[0]} name={metrics[0]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px' }}/>
            {metrics.map((metric, idx) => (
              <Scatter key={metric} name={metric} data={chartData} fill={COLORS[idx % COLORS.length]} />
            ))}
          </ScatterChart>
        );
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={true}
              label={({ name, value }) => `${name}: ${value}`}
              outerRadius={100}
              dataKey={metrics[0]}
              nameKey="_label"
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: '4px', fontSize: '11px' }} />
            <Legend wrapperStyle={{ fontSize: '10px' }}/>
          </PieChart>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full h-full min-h-0 flex-1 relative">
      <div className="absolute inset-0 w-full h-full">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart() as any}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

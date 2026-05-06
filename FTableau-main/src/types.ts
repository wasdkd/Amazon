/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DataType = 'string' | 'number' | 'date';

export interface DataField {
  name: string;
  type: DataType;
  isMeasure: boolean;
}

export interface Dataset {
  name: string;
  data: any[];
  fields: DataField[];
}

export type ChartType = 'bar' | 'line' | 'scatter' | 'pie' | 'area';

export type ViewType = 'file' | 'data' | 'analysis' | 'dashboard';

export type AggregationType = 'sum' | 'avg' | 'min' | 'max' | 'count';

export type SortType = 'none' | 'asc' | 'desc';

export interface DashboardItem {
  id: string;
  config: ChartConfig;
  title: string;
}

export interface ChartConfig {
  type: ChartType;
  xAxis: string[];
  yAxis: string[];
  filters: Record<string, string[]>;
  aggregation: Record<string, AggregationType>;
  sort: SortType;
  showLabels: boolean;
  color: string | null;
  size: string | null;
}

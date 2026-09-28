export interface DataRow {
  [key: string]: any;
}

export type FillMethod = '0' | 'mean' | 'median' | 'mode' | 'none';

export interface CleaningConfig {
  dedupColumns: string[];
  missingValueConfig: {
    [column: string]: FillMethod;
  };
}

export interface StatsConfig {
  groupBy: string[];
  aggregations: {
    column: string;
    type: 'sum' | 'avg' | 'count' | 'min' | 'max';
  }[];
}

export interface FileObject {
  id: string;
  name: string;
  size: number;
  data: DataRow[];
  columns: string[];
  rowCount: number;
}

export interface FilterRule {
  column: string;
  operator: 'equals' | 'contains' | 'gt' | 'lt' | 'not_equals';
  value: string;
}

export interface AnalyticsConfig {
  filters: FilterRule[];
  groupBy: string[];
  aggregations: {
    column: string;
    type: 'sum' | 'avg' | 'count' | 'min' | 'max';
  }[];
}

export interface ProcessingState {
  currentStep: number;
  files: FileObject[];
  originalData: DataRow[];
  cleanedData: DataRow[];
  filteredData: DataRow[];
  statsData: DataRow[];
  fileName: string;
  columns: string[];
}

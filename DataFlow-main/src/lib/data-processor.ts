import { DataRow, FillMethod, StatsConfig, FilterRule } from '../types';

export function getColumnStats(data: DataRow[], column: string) {
  const values = data
    .map((row) => row[column])
    .filter((v) => v !== null && v !== undefined && v !== '' && !isNaN(Number(v)))
    .map(Number);

  if (values.length === 0) return null;

  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;
  
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  const counts: { [key: string]: number } = {};
  let maxCount = 0;
  let mode = sorted[0];
  values.forEach((v) => {
    counts[v] = (counts[v] || 0) + 1;
    if (counts[v] > maxCount) {
      maxCount = counts[v];
      mode = v;
    }
  });

  return { mean, median, mode, min: sorted[0], max: sorted[sorted.length - 1] };
}

export function cleanData(
  data: DataRow[],
  dedupColumns: string[],
  missingValueConfig: { [col: string]: FillMethod }
): DataRow[] {
  let processed = [...data];

  // 1. Deduplication
  if (dedupColumns.length > 0) {
    const seen = new Set();
    processed = processed.filter((row) => {
      const key = dedupColumns.map((col) => String(row[col])).join('|');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // 2. Missing values
  const columns = Object.keys(missingValueConfig);
  columns.forEach((col) => {
    const method = missingValueConfig[col];
    if (method === 'none') return;

    let fillValue: any = 0;
    if (method !== '0') {
      const stats = getColumnStats(processed, col);
      if (stats) {
        if (method === 'mean') fillValue = stats.mean;
        else if (method === 'median') fillValue = stats.median;
        else if (method === 'mode') fillValue = stats.mode;
      }
    }

    processed = processed.map((row) => {
      const val = row[col];
      const isMissing = val === null || val === undefined || val === '' || (typeof val === 'number' && isNaN(val));
      return isMissing ? { ...row, [col]: fillValue } : row;
    });
  });

  return processed;
}

export function filterData(data: DataRow[], filters: FilterRule[]): DataRow[] {
  if (filters.length === 0) return data;

  return data.filter(row => {
    return filters.every(rule => {
      const val = row[rule.column];
      const target = rule.value;
      
      if (val === null || val === undefined) return false;

      const numVal = Number(val);
      const numTarget = Number(target);

      switch (rule.operator) {
        case 'equals': return String(val) === target;
        case 'not_equals': return String(val) !== target;
        case 'contains': return String(val).toLowerCase().includes(target.toLowerCase());
        case 'gt': return !isNaN(numVal) && !isNaN(numTarget) && numVal > numTarget;
        case 'lt': return !isNaN(numVal) && !isNaN(numTarget) && numVal < numTarget;
        default: return true;
      }
    });
  });
}

export function aggregateData(data: DataRow[], config: StatsConfig): DataRow[] {
  const { groupBy, aggregations } = config;
  if (groupBy.length === 0) return [];

  const groups: { [key: string]: { rows: DataRow[]; keys: { [k: string]: any } } } = {};

  data.forEach((row) => {
    const groupKey = groupBy.map((col) => String(row[col] ?? '').trim()).join('|');
    if (!groups[groupKey]) {
      const keys: { [k: string]: any } = {};
      groupBy.forEach((col) => (keys[col] = String(row[col] ?? '').trim()));
      groups[groupKey] = { rows: [], keys };
    }
    groups[groupKey].rows.push(row);
  });

  return Object.values(groups).map(({ rows, keys }) => {
    const result: DataRow = { ...keys };
    // Create a combined name for the group to be used in charts
    result['_groupName'] = groupBy.map(col => String(keys[col])).join('-');
    
    aggregations.forEach((agg) => {
      const values = rows
        .map((r) => r[agg.column])
        .filter((v) => v !== null && v !== undefined && v !== '' && !isNaN(Number(v)))
        .map(Number);

      let val = 0;
      if (values.length > 0) {
        if (agg.type === 'sum') val = values.reduce((a, b) => a + b, 0);
        else if (agg.type === 'avg') val = values.reduce((a, b) => a + b, 0) / values.length;
        else if (agg.type === 'count') val = values.length;
        else if (agg.type === 'min') val = Math.min(...values);
        else if (agg.type === 'max') val = Math.max(...values);
      }
      result[`${agg.column}_${agg.type}`] = Number(val.toFixed(2));
    });
    return result;
  });
}

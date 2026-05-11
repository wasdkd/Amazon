import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

export interface TableData {
  headers: string[];
  rows: any[][];
}

export interface Mergeinfo {
  s: { r: number; c: number };
  e: { r: number; c: number };
}

export const parseExcel = async (file: File): Promise<TableData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        if (json.length === 0) {
          resolve({ headers: [], rows: [] });
          return;
        }

        const headers = json[0].map(h => String(h || ''));
        const rows = json.slice(1);

        resolve({ headers, rows });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Calculates merges based on hierarchical identity.
 * Rule: Merge cell (r, c) if it matches (r-1, c) AND all columns to the left (0 to c-1) also matched.
 */
export const calculateSmartMerges = (rows: any[][], columnsToMerge: number[]): Mergeinfo[] => {
  const merges: Mergeinfo[] = [];
  if (rows.length === 0) return merges;

  columnsToMerge.sort((a, b) => a - b);

  for (const colIndex of columnsToMerge) {
    let startRow = 0;
    
    for (let r = 1; r <= rows.length; r++) {
      const isLastRow = r === rows.length;
      const currentValue = !isLastRow ? rows[r][colIndex] : null;
      const prevValue = rows[r - 1][colIndex];

      // Check if parents matched (all columns to the left of this one that are also in columnsToMerge)
      let parentsMatch = true;
      for (const parentCol of columnsToMerge) {
        if (parentCol >= colIndex) break;
        if (!isLastRow && rows[r][parentCol] !== rows[r - 1][parentCol]) {
          parentsMatch = false;
          break;
        }
      }

      const shouldContinueMerge = !isLastRow && currentValue === prevValue && parentsMatch;

      if (!shouldContinueMerge) {
        if (r - 1 > startRow) {
          merges.push({
            s: { r: startRow + 1, c: colIndex }, // +1 because headers are row 0 in excel export perspective
            e: { r: r, c: colIndex }
          });
        }
        startRow = r;
      }
    }
  }

  return merges;
};

/**
 * Automatically detects which leading columns have hierarchical duplicate data.
 */
export const detectMergeableColumns = (rows: any[][]): number[] => {
  const mergeableCols: number[] = [];
  if (rows.length < 2) return [];

  // Check columns from left to right
  for (let c = 0; c < rows[0].length; c++) {
    let duplicateCount = 0;
    for (let r = 1; r < rows.length; r++) {
      if (rows[r][c] === rows[r - 1][c]) {
        duplicateCount++;
      }
    }
    
    // If more than 10% of cells (or a minimum count) are duplicates, consider it a merge candidate
    // And it must be hierarchical: siblings to the left must also be merged
    if (duplicateCount > 0) {
      mergeableCols.push(c);
    } else {
      // Once we hit a column with no adjacent duplicates, we stop deep hierarchy
      break;
    }
  }
  return mergeableCols;
};

export const exportFormattedExcel = async (
  data: TableData,
  merges: Mergeinfo[],
  theme: 'professional' | 'modern' | 'minimal',
  colorColumnIndex: number // New: column index to drive row colors
) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Beautified Sheet');

  // Add headers
  const headerRow = worksheet.addRow(data.headers);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: theme === 'professional' ? 'FF1F4E78' : theme === 'modern' ? 'FF2E75B6' : 'FF333333' }
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  // Calculate row group colors based on hierarchical identity of the colorColumnIndex
  const rowGroupIndex = new Array(data.rows.length).fill(0);
  let currentGroup = 0;
  for (let r = 1; r < data.rows.length; r++) {
    // Check if the cell at colorColumnIndex or any of its parents changed
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

  // Add rows
  data.rows.forEach((row, idx) => {
    const excelRow = worksheet.addRow(row);
    // Alternate colors based on the identified groups
    if (rowGroupIndex[idx] % 2 === 1) {
      excelRow.eachCell((cell, colNumber) => {
        // ExcelJS colNumber is 1-based
        if (colNumber > colorColumnIndex) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFECFDF5' } // Fresh Light Green (Tailwind emerald-50 equivalent)
          };
        }
      });
    }
  });

  // Apply Merges
  merges.forEach(m => {
    // ExcelJS uses 1-based indexing for rows and columns
    // m.s.r and m.e.r were calculated with offset for header
    worksheet.mergeCells(m.s.r + 1, m.s.c + 1, m.e.r + 1, m.e.c + 1);
    const cell = worksheet.getCell(m.s.r + 1, m.s.c + 1);
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Borders and Auto-width
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });

  worksheet.columns.forEach(column => {
    let maxLength = 0;
    column.eachCell!({ includeEmpty: true }, cell => {
      const columnLength = cell.value ? cell.value.toString().length : 10;
      if (columnLength > maxLength) {
        maxLength = columnLength;
      }
    });
    column.width = maxLength < 12 ? 12 : maxLength + 2;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'beautified_excel.xlsx';
  anchor.click();
  window.URL.revokeObjectURL(url);
};

import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType } from 'docx';
import { TableData } from '../services/gemini';

export async function exportToExcel(tableData: TableData, fileName: string = 'export.xlsx') {
  const ws = XLSX.utils.aoa_to_sheet([tableData.headers, ...tableData.rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(data, fileName);
}

export async function exportToCSV(tableData: TableData, fileName: string = 'export.csv') {
  const ws = XLSX.utils.aoa_to_sheet([tableData.headers, ...tableData.rows]);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const data = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  saveAs(data, fileName);
}

export async function exportToWord(content: string, isTable: boolean = false, tableData?: TableData, fileName: string = 'export.docx') {
  let sections = [];

  if (isTable && tableData) {
    const docTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: tableData.headers.map(h => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })] }))
        }),
        ...tableData.rows.map(row => new TableRow({
          children: row.map(cell => new TableCell({ children: [new Paragraph(cell)] }))
        }))
      ]
    });
    sections.push({ children: [docTable] });
  } else {
    sections.push({
      children: content.split('\n').map(line => new Paragraph({ children: [new TextRun(line)] }))
    });
  }

  const doc = new Document({ sections });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, fileName);
}

export async function exportToText(content: string, fileName: string = 'export.txt') {
  const data = new Blob([content], { type: 'text/plain;charset=utf-8' });
  saveAs(data, fileName);
}

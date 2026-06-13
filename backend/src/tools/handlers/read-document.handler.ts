import * as path from 'path';
import { parse as parseCsv } from 'csv-parse/sync';
import { DocumentsService } from '@documents/documents.service';
import { CsvRow, FileExtension, ToolResult } from '@doc-agent/shared';

const CURRENCY_SYMBOLS: Record<string, string> = {
  '$': 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '¥': 'JPY',
};

export async function readDocument(
  documentsService: DocumentsService,
  filename: string,
): Promise<ToolResult<string | object | CsvRow[]>> {
  const getRaw = (buffer: Buffer) => buffer.toString('utf-8');

  try {
    const buffer = await documentsService.readFile(filename);
    const ext = path.extname(filename).replace('.', '').toLowerCase();

    if (ext === FileExtension.Csv) {
      return { success: true, content: parseCsvContent(getRaw(buffer)) };
    }

    if (ext === FileExtension.Json) {
      return { success: true, content: JSON.parse(getRaw(buffer)) };
    }

    return { success: true, content: getRaw(buffer) };
  } catch (err) {
    return { success: false, content: '', error: (err as Error).message };
  }
}

function normaliseCurrencyCell(value: string): string {
  for (const [symbol, code] of Object.entries(CURRENCY_SYMBOLS)) {
    if (value.startsWith(symbol)) {
      return `${code} ${value.slice(1)}`;
    }
  }
  return value;
}

function parseCsvContent(raw: string): CsvRow[] {
  const rows: Record<string, string>[] = parseCsv(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  return rows.map((row) => {
    const normalised: CsvRow = {};
    for (const [key, value] of Object.entries(row)) {
      const trimmed = value.trim();
      if (trimmed === '') {
        normalised[key] = null;
      } else {
        normalised[key] = normaliseCurrencyCell(trimmed);
      }
    }
    return normalised;
  });
}

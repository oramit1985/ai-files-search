import { readDocument } from '@tools/handlers/read-document.handler';
import { DocumentsService } from '@documents/documents.service';

const mockService = (content: string) =>
  ({ readFile: () => Promise.resolve(Buffer.from(content)) } as unknown as DocumentsService);

const failingService = (message: string) =>
  ({ readFile: () => Promise.reject(new Error(message)) } as unknown as DocumentsService);

describe('readDocument', () => {
  describe('CSV files', () => {
    it('returns parsed JSON rows', async () => {
      const csv = 'name,price,units\nWidget,$9.99,5\nGadget,€14.00,';
      const result = await readDocument(mockService(csv), 'sales.csv');
      expect(result.success).toBe(true);
      const rows = result.content as Record<string, string | null>[];
      expect(rows).toHaveLength(2);
      expect(rows[0].price).toBe('USD 9.99');
      expect(rows[1].price).toBe('EUR 14.00');
      expect(rows[1].units).toBeNull();     // empty cell → null
    });

    it('prefixes currency symbols with ISO code', async () => {
      const csv = 'amount\n$100\n€200\n£300\n¥400';
      const result = await readDocument(mockService(csv), 'prices.csv');
      const rows = result.content as Record<string, string | null>[];
      expect(rows.map((r) => r.amount)).toEqual(['USD 100', 'EUR 200', 'GBP 300', 'JPY 400']);
    });
  });

  describe('JSON files', () => {
    it('returns parsed object', async () => {
      const json = JSON.stringify({ database: { pool: { max: 100 } } });
      const result = await readDocument(mockService(json), 'config.json');
      expect(result.success).toBe(true);
      expect((result.content as any).database.pool.max).toBe(100);
    });
  });

  describe('text and markdown files', () => {
    it('returns raw string for .txt', async () => {
      const text = 'Hello world';
      const result = await readDocument(mockService(text), 'emails.txt');
      expect(result.success).toBe(true);
      expect(result.content).toBe(text);
    });

    it('returns raw string for .md', async () => {
      const md = '## Meeting notes\n- item 1';
      const result = await readDocument(mockService(md), 'meetings.md');
      expect(result.success).toBe(true);
      expect(result.content).toBe(md);
    });
  });

  describe('error handling', () => {
    it('returns failure when file not found', async () => {
      const result = await readDocument(failingService('File not found: "missing.txt".'), 'missing.txt');
      expect(result.success).toBe(false);
      expect(result.error).toContain('File not found');
    });

    it('returns failure when size cap exceeded', async () => {
      const result = await readDocument(failingService('exceeds the 100 KB read limit'), 'big.txt');
      expect(result.success).toBe(false);
      expect(result.error).toContain('100 KB');
    });

    it('returns failure on path traversal attempt', async () => {
      const result = await readDocument(failingService('Access denied'), '../secret.txt');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Access denied');
    });
  });
});

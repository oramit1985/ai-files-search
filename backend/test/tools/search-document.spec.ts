import { searchDocument } from '@tools/handlers/search-document.handler';
import { DocumentsService } from '@documents/documents.service';

const mockService = (content: string) =>
  ({ readFile: () => Promise.resolve(Buffer.from(content)) } as unknown as DocumentsService);

const SAMPLE = [
  'Line one about nothing',
  'Line two mentions March 12',
  'Line three is context',
  'Line four mentions March 12 again',
  'Line five is more context',
].join('\n');

describe('searchDocument', () => {
  it('returns matches with surrounding context', async () => {
    const result = await searchDocument(mockService(SAMPLE), 'meetings.md', 'March 12');
    expect(result.success).toBe(true);
    const matches = result.content as any[];
    expect(matches).toHaveLength(2);
    expect(matches[0].lineNumber).toBe(2);
    expect(matches[0].line).toContain('March 12');
    expect(matches[0].context.length).toBeGreaterThan(0);
  });

  it('is case-insensitive', async () => {
    const result = await searchDocument(mockService(SAMPLE), 'meetings.md', 'march 12');
    const matches = result.content as any[];
    expect(matches).toHaveLength(2);
  });

  it('returns empty array when no match found', async () => {
    const result = await searchDocument(mockService(SAMPLE), 'meetings.md', 'nonexistent keyword');
    expect(result.success).toBe(true);
    expect(result.content).toEqual([]);
  });

  it('returns failure when file service throws', async () => {
    const failing = {
      readFile: () => Promise.reject(new Error('File not found: "x.md".')),
    } as unknown as DocumentsService;
    const result = await searchDocument(failing, 'x.md', 'query');
    expect(result.success).toBe(false);
    expect(result.error).toContain('File not found');
  });
});

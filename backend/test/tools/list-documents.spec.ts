import { listDocuments } from '@tools/handlers/list-documents.handler';
import { DocumentsService } from '@documents/documents.service';

const mockService = (
  files: ReturnType<DocumentsService['listFiles']> extends Promise<infer T>
    ? T
    : never,
) =>
  ({ listFiles: () => Promise.resolve(files) }) as unknown as DocumentsService;

describe('listDocuments', () => {
  it('returns file list on success', async () => {
    const files = [{ name: 'meetings.md', size: 1024, extension: 'md' }];
    const result = await listDocuments(mockService(files));
    expect(result.success).toBe(true);
    expect(result.content).toEqual(files);
  });

  it('returns empty array for empty directory', async () => {
    const result = await listDocuments(mockService([]));
    expect(result.success).toBe(true);
    expect(result.content).toEqual([]);
  });

  it('returns failure when service throws', async () => {
    const failing = {
      listFiles: () => Promise.reject(new Error('permission denied')),
    } as unknown as DocumentsService;
    const result = await listDocuments(failing);
    expect(result.success).toBe(false);
    expect(result.error).toContain('permission denied');
  });
});

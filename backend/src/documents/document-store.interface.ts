import { DocumentInfo } from '@doc-agent/shared';

export const DOCUMENT_STORE = 'DOCUMENT_STORE';

export interface DocumentStore {
  listFiles(): Promise<DocumentInfo[]>;
  readFile(filename: string): Promise<Buffer>;
}

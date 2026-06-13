import { Injectable, Inject } from '@nestjs/common';
import { DocumentInfo } from '@doc-agent/shared';
import type { DocumentStore } from './document-store.interface';
import { DOCUMENT_STORE } from './document-store.interface';

@Injectable()
export class DocumentsService {
  constructor(@Inject(DOCUMENT_STORE) private readonly store: DocumentStore) {}

  listFiles(): Promise<DocumentInfo[]> {
    return this.store.listFiles();
  }

  readFile(filename: string): Promise<Buffer> {
    return this.store.readFile(filename);
  }
}

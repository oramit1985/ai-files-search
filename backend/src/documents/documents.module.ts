import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { LocalDocumentStore } from './local-document.store';
import { DOCUMENT_STORE } from './document-store.interface';

@Module({
  providers: [
    { provide: DOCUMENT_STORE, useClass: LocalDocumentStore },
    DocumentsService,
  ],
  exports: [DocumentsService],
})
export class DocumentsModule {}

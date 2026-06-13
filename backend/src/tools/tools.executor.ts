import { Injectable } from '@nestjs/common';
import { DocumentsService } from '@documents/documents.service';
import { ToolName, ToolResult } from '@doc-agent/shared';
import { listDocuments } from './handlers/list-documents.handler';
import { readDocument } from './handlers/read-document.handler';
import { searchDocument } from './handlers/search-document.handler';

@Injectable()
export class ToolsExecutor {
  constructor(private readonly documentsService: DocumentsService) {}

  async execute(toolName: string, input: Record<string, string>): Promise<ToolResult> {
    switch (toolName) {
      case ToolName.ListDocuments:
        return listDocuments(this.documentsService);

      case ToolName.ReadDocument:
        return readDocument(this.documentsService, input.filename);

      case ToolName.SearchDocument:
        return searchDocument(this.documentsService, input.filename, input.query);

      default:
        return { success: false, content: null, error: `Unknown tool: "${toolName}"` };
    }
  }
}

import { DocumentsService } from '@documents/documents.service';
import { ToolResult, DocumentInfo } from '@doc-agent/shared';

export async function listDocuments(documentsService: DocumentsService): Promise<ToolResult<DocumentInfo[]>> {
  try {
    const files = await documentsService.listFiles();
    return { success: true, content: files };
  } catch (err) {
    return { success: false, content: [], error: (err as Error).message };
  }
}

import { DocumentsService } from '@documents/documents.service';
import { ToolResult, DocumentInfo } from '@doc-agent/shared';

/**
 * Tool: list_documents
 *
 * Returns the name, size, and extension of every file in the knowledge base.
 * The agent calls this once at the start of a conversation so it knows which
 * files exist before deciding which ones to read or search.
 */
export async function listDocuments(documentsService: DocumentsService): Promise<ToolResult<DocumentInfo[]>> {
  try {
    const files = await documentsService.listFiles();
    return { success: true, content: files };
  } catch (err) {
    return { success: false, content: [], error: (err as Error).message };
  }
}

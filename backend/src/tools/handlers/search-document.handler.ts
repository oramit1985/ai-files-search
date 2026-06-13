import { DocumentsService } from '@documents/documents.service';
import { SearchMatch, ToolResult } from '@doc-agent/shared';

const CONTEXT_LINES = 2;

export async function searchDocument(
  documentsService: DocumentsService,
  filename: string,
  query: string,
): Promise<ToolResult<SearchMatch[]>> {
  try {
    const content = (await documentsService.readFile(filename)).toString('utf-8');
    const lines = content.split('\n');
    const lowerQuery = query.toLowerCase();
    const matches: SearchMatch[] = [];

    lines.forEach((line, index) => {
      if (line.toLowerCase().includes(lowerQuery)) {
        const start = Math.max(0, index - CONTEXT_LINES);
        const end = Math.min(lines.length - 1, index + CONTEXT_LINES);
        const context = lines.slice(start, end + 1).filter((_, i) => i + start !== index);

        matches.push({
          lineNumber: index + 1,
          line: line.trim(),
          context,
        });
      }
    });

    return { success: true, content: matches };
  } catch (err) {
    return { success: false, content: [], error: (err as Error).message };
  }
}

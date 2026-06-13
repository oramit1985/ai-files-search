import { DocumentsService } from '@documents/documents.service';
import { SearchMatch, ToolResult } from '@doc-agent/shared';

/**
 * Tool: search_document
 *
 * Searches a file for lines that contain the given query (case-insensitive)
 * and returns each match with surrounding context lines.
 *
 * Use this tool instead of read_document when the question targets a specific
 * keyword (a date, a name, an error code, etc.) — it avoids loading the full
 * file and lets the agent jump straight to the relevant section.
 *
 * Each result includes:
 *   - lineNumber: 1-based line number of the match
 *   - line:       the matched line (trimmed)
 *   - context:    the CONTEXT_LINES lines above and below the match
 *
 * If a match is found, answer from the returned context directly —
 * do not follow up with read_document on the same file.
 */
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

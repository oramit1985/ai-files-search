import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import {ToolName} from "@doc-agent/shared";

@Injectable()
export class ToolsRegistry {
  getDefinitions(): Anthropic.Tool[] {
    return [
      {
        name: ToolName.ListDocuments,
        description:
          'List all available documents in the knowledge base. Always call this first to discover which files exist before reading them.',
        input_schema: { type: 'object', properties: {}, required: [] },
      },
      {
        name: ToolName.ReadDocument,
        description:
          'Read the full content of a document. CSV files are returned as structured JSON rows with currency symbols stripped and empty cells as null. JSON files are returned as parsed objects. Text and Markdown files are returned as raw strings.',
        input_schema: {
          type: 'object',
          properties: {
            filename: {
              type: 'string',
              description: 'The filename to read (e.g. "meetings.md", "sales-q1.csv").',
            },
          },
          required: ['filename'],
        },
      },
      {
        name: ToolName.SearchDocument,
        description:
          'Search for a keyword or phrase within a document. Returns matching lines with up to 2 lines of surrounding context. Use this to locate a specific section without reading the entire file.',
        input_schema: {
          type: 'object',
          properties: {
            filename: {
              type: 'string',
              description: 'The filename to search within.',
            },
            query: {
              type: 'string',
              description: 'The keyword or phrase to search for (case-insensitive).',
            },
          },
          required: ['filename', 'query'],
        },
      },
    ];
  }
}

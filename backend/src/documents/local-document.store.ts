import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { DocumentInfo } from '@doc-agent/shared';
import { DocumentStore } from './document-store.interface';

const DOCUMENTS_DIR = path.resolve(process.cwd(), 'documents');
const MAX_FILE_SIZE = 100 * 1024; // 100 KB

@Injectable()
export class LocalDocumentStore implements DocumentStore {
  async listFiles(): Promise<DocumentInfo[]> {
    const entries = fs.readdirSync(DOCUMENTS_DIR, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile())
      .map((e) => {
        const stat = fs.statSync(path.join(DOCUMENTS_DIR, e.name));
        return {
          name: e.name,
          size: stat.size,
          extension: path.extname(e.name).replace('.', ''),
        };
      });
  }

  async readFile(filename: string): Promise<Buffer> {
    const resolved = this.resolveSafePath(filename);
    const stat = fs.statSync(resolved);
    if (stat.size > MAX_FILE_SIZE) {
      throw new Error(`File "${filename}" exceeds the 100 KB read limit (${stat.size} bytes).`);
    }
    return fs.readFileSync(resolved);
  }

  private resolveSafePath(filename: string): string {
    const resolved = path.resolve(DOCUMENTS_DIR, filename);
    if (!resolved.startsWith(DOCUMENTS_DIR + path.sep) && resolved !== DOCUMENTS_DIR) {
      throw new Error(`Access denied: "${filename}" is outside the documents directory.`);
    }
    if (!fs.existsSync(resolved)) {
      throw new Error(`File not found: "${filename}".`);
    }
    return resolved;
  }
}

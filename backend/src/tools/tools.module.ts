import { Module } from '@nestjs/common';
import { DocumentsModule } from '@documents/documents.module';
import { ToolsRegistry } from './tools.registry';
import { ToolsExecutor } from './tools.executor';

@Module({
  imports: [DocumentsModule],
  providers: [ToolsRegistry, ToolsExecutor],
  exports: [ToolsRegistry, ToolsExecutor, DocumentsModule],
})
export class ToolsModule {}

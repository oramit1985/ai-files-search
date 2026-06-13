export enum MessageRole {
  System    = 'system',
  User      = 'user',
  Assistant = 'assistant',
  Tool      = 'tool',
}

export enum ModelId {
  ClaudeOpus4   = 'claude-opus-4-8',
  ClaudeSonnet4 = 'claude-sonnet-4-6',
  ClaudeHaiku4  = 'claude-haiku-4-5',
}

export enum ToolName {
  ListDocuments  = 'list_documents',
  ReadDocument   = 'read_document',
  SearchDocument = 'search_document',
}

export enum LogLevel {
  Error = 'ERROR',
  Warn  = 'WARN',
  Info  = 'INFO',
  Debug = 'DEBUG',
}

export enum FinishReason {
  EndTurn      = 'end_turn',
  ToolUse      = 'tool_use',
  MaxTokens    = 'max_tokens',
  StopSequence = 'stop_sequence',
}

export enum ContentBlockType {
  Text       = 'text',
  ToolUse    = 'tool_use',
  ToolResult = 'tool_result',
}

export enum FileExtension {
  Markdown = 'md',
  Csv      = 'csv',
  Json     = 'json',
  Text     = 'txt',
}

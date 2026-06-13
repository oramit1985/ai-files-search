import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsArray, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { MessageRole, ModelId } from '@doc-agent/shared';

class HistoryMessageDto {
  @IsIn([MessageRole.User, MessageRole.Assistant])
  role!: MessageRole.User | MessageRole.Assistant;

  @IsString()
  content!: string;
}

export class QueryDto {
  @IsString()
  @MinLength(1)
  query!: string;

  @IsOptional()
  @IsEnum(ModelId)
  model?: ModelId;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HistoryMessageDto)
  history?: HistoryMessageDto[];
}

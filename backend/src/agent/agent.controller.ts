import { Body, Controller, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AgentService } from './agent.service';
import { QueryDto } from './dto/query.dto';
import { StreamEvent } from '@doc-agent/shared';

@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('query')
  async query(@Body() dto: QueryDto, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const emit = (event: StreamEvent) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    try {
      await this.agentService.runAgentLoop(dto.query, emit, dto.model, dto.history);
    } catch (err) {
      emit({ type: 'error', data: (err as Error).message });
      emit({ type: 'done' });
    } finally {
      res.end();
    }
  }
}

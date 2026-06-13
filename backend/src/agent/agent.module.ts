import { Module } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { ToolsModule } from '@tools/tools.module';

@Module({
  imports: [ToolsModule],
  providers: [
    AgentService,
    { provide: Anthropic, useFactory: () => new Anthropic() },
  ],
  controllers: [AgentController],
})
export class AgentModule {}

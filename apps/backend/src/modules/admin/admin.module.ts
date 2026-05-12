import { Module } from '@nestjs/common';
import { QuotesModule } from '../quotes/quotes.module';
import { VotesModule } from '../votes/votes.module';
import { AdminImportController } from './admin-import.controller';

@Module({
  imports: [QuotesModule, VotesModule],
  controllers: [AdminImportController],
})
export class AdminModule {}

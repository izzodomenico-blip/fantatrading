import { Module } from '@nestjs/common';
import { TeamsModule } from '../teams/teams.module';
import { MarketController } from './market.controller';
import { MarketService } from './market.service';

@Module({
  imports: [TeamsModule],
  controllers: [MarketController],
  providers: [MarketService],
})
export class MarketModule {}

import { Module } from '@nestjs/common';
import { AdminSettlementController } from './settlement-admin.controller';
import { TeamSettlementController } from './settlement-team.controller';
import { SettlementService } from './settlement.service';

@Module({
  controllers: [AdminSettlementController, TeamSettlementController],
  providers: [SettlementService],
  exports: [SettlementService],
})
export class SettlementModule {}

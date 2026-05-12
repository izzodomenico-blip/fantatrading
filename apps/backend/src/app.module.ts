import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CalculationsModule } from './modules/calculations/calculations.module';
import { SeasonsModule } from './modules/seasons/seasons.module';
import { PlayersModule } from './modules/players/players.module';
import { TeamsModule } from './modules/teams/teams.module';
import { MarketModule } from './modules/market/market.module';
import { AdminModule } from './modules/admin/admin.module';
import { ReportsModule } from './modules/reports/reports.module';
import appConfig from './config/app.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    HealthModule,
    CalculationsModule,
    SeasonsModule,
    PlayersModule,
    TeamsModule,
    MarketModule,
    AdminModule,
    ReportsModule,
  ],
})
export class AppModule {}

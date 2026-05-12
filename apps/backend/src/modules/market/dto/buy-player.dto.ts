import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class BuyPlayerDto {
  @ApiProperty()
  @IsString()
  teamId: string;

  @ApiProperty()
  @IsString()
  playerId: string;
}

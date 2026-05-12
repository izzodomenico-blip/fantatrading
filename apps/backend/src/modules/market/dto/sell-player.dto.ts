import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SellPlayerDto {
  @ApiProperty()
  @IsString()
  teamId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  playerId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  positionId?: string;
}

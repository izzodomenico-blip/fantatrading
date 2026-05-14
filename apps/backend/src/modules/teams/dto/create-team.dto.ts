import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateTeamDto {
  @ApiProperty()
  @IsString()
  seasonId: string;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  initialVirtualCapital?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  teamName?: string;
}

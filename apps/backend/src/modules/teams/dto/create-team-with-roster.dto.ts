import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateTeamWithRosterDto {
  @ApiProperty()
  @IsString()
  seasonId: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  initialVirtualCapital: number;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  playerIds: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  teamName?: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  resetExistingDemoTeam?: boolean;
}

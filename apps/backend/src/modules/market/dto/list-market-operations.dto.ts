import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ListMarketOperationsDto {
  @ApiProperty()
  @IsString()
  teamId: string;
}

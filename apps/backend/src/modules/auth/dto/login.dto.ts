import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@fantatrading.local' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'S3curePassword!' })
  @IsString()
  password: string;
}

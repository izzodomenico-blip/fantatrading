import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'player@fantatrading.local' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'S3curePassword!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Mario' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Rossi' })
  @IsString()
  lastName: string;
}

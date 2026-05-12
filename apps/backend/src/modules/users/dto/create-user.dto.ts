import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'admin@fantatrading.local' })
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

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.PARTICIPANT })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

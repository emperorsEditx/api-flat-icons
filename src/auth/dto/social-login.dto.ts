import { IsEmail, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class SocialLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  providerId?: string;

  @IsString()
  @IsNotEmpty()
  provider: string; // 'google', 'facebook', etc.
}

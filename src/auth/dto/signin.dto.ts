import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO for user signin request
 */
export class SigninDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

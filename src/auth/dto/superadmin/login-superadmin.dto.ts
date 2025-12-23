import { IsEmail, IsString, IsNotEmpty } from "class-validator";

export class LoginSuperadminDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}


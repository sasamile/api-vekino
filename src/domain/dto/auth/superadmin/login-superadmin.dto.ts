import { IsEmail, IsString, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LoginSuperadminDto {
  @ApiProperty({
    description: "Correo electrónico del superadministrador",
    example: "nspes2020@gmail.com",
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: "Contraseña del superadministrador",
    example: "Sa722413.",
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}


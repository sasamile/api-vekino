import { IsEmail, IsString, MinLength, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RegisterSuperadminDto {
  @ApiProperty({
    description: "Correo electrónico del superadministrador",
    example: "nspes2020@gmail.com",
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: "Contraseña del superadministrador (mínimo 8 caracteres)",
    example: "Sa722413.",
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    description: "Nombre completo del superadministrador",
    example: "Santiago Suescun",
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}


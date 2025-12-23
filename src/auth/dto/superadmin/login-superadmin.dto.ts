import { IsEmail, IsString, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LoginSuperadminDto {
  @ApiProperty({
    description: "Correo electrónico del superadministrador",
    example: "admin@vekino.com",
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: "Contraseña del superadministrador",
    example: "password123",
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}


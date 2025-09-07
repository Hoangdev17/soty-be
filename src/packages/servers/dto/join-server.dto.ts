import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class JoinServerDto {
  @ApiProperty({
    description: 'Mã invite để join server',
    example: 'abc123def456',
  })
  @IsString()
  @IsNotEmpty()
  inviteCode: string;
}

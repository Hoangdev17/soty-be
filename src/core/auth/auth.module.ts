import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SnowflakeID } from 'src/utils/snowflake';
import { PrismaService } from '../prisma/prisma.service';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from 'src/packages/users/users.module';
import { TokenUtil } from 'src/utils/token.util';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN },
    }),
    UsersModule,
  ],
  providers: [AuthService, JwtStrategy, PrismaService, SnowflakeID, TokenUtil],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}

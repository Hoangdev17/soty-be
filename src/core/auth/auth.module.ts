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
import { UsersService } from 'src/packages/users/users.service';
import { TokenUtil } from 'src/utils/token.util';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.AUTH_JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    PrismaService,
    SnowflakeID,
    UsersService,
    TokenUtil,
  ],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}

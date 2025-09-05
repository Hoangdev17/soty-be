import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './packages/users/users.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './core/auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

@Module({
  
  imports:[
    ConfigModule.forRoot(), 
    PassportModule.register({ defaultStrategy: 'jwt' }),
    UsersModule, 
    AuthModule],
  
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

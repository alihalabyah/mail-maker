import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const expiry = config.get<string>('JWT_EXPIRY', '7d');
        return {
          secret: config.getOrThrow<string>('JWT_SECRET'),
          // Cast needed: @nestjs/jwt expects StringValue (ms branded type)
          // but ConfigService returns plain string. Runtime value is valid.
          signOptions: { expiresIn: expiry as unknown as number },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [JwtModule],
})
export class AuthModule {}

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiKeysService } from '../api-keys.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private apiKeysService: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { apiKey?: unknown; user?: unknown }>();

    const rawKey =
      (req.headers['x-api-key'] as string | undefined) ??
      req.headers['authorization']?.replace(/^Bearer\s+/i, '');

    if (!rawKey || !rawKey.startsWith('mk_')) {
      throw new UnauthorizedException('Missing or invalid API key');
    }

    const result = await this.apiKeysService.validate(rawKey);
    if (!result) throw new UnauthorizedException('Invalid or expired API key');

    req.apiKey = result;
    req.user = result.user;
    return true;
  }
}

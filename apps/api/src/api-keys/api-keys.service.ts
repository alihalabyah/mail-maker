import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { ApiKey, User } from '@prisma/client';

@Injectable()
export class ApiKeysService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateApiKeyDto, userId: string) {
    const rawKey = `mk_${randomBytes(32).toString('hex')}`;
    const prefix = rawKey.substring(0, 10);
    const keyHash = await bcrypt.hash(rawKey, 12);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        name: dto.name,
        keyHash,
        prefix,
        scopes: dto.scopes,
        userId,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });

    // Return the raw key once — never stored in plain text
    return { ...this.sanitize(apiKey), key: rawKey };
  }

  async findAllForUser(userId: string) {
    const keys = await this.prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return keys.map(this.sanitize);
  }

  async remove(id: string, userId: string) {
    const key = await this.prisma.apiKey.findFirst({ where: { id, userId } });
    if (!key) throw new NotFoundException('API key not found');
    await this.prisma.apiKey.delete({ where: { id } });
  }

  async validate(rawKey: string): Promise<(ApiKey & { user: User }) | null> {
    const prefix = rawKey.substring(0, 10);
    const candidates = await this.prisma.apiKey.findMany({
      where: { prefix },
      include: { user: true },
    });

    for (const candidate of candidates) {
      const match = await bcrypt.compare(rawKey, candidate.keyHash);
      if (match) {
        if (candidate.expiresAt && candidate.expiresAt < new Date()) {
          return null; // Expired
        }
        // Update lastUsedAt in background (non-blocking)
        this.prisma.apiKey
          .update({ where: { id: candidate.id }, data: { lastUsedAt: new Date() } })
          .catch(() => undefined);
        return candidate;
      }
    }

    return null;
  }

  private sanitize(key: ApiKey) {
    const { keyHash: _keyHash, ...safe } = key;
    return safe;
  }
}

import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

function normalizeDatabaseUrl(rawUrl: string | undefined) {
  if (!rawUrl) return rawUrl;

  try {
    const url = new URL(rawUrl);
    const isSupabasePooler = url.hostname.includes('.pooler.supabase.com') && url.port === '6543';
    if (!isSupabasePooler) return rawUrl;

    if (!url.searchParams.has('pgbouncer')) {
      url.searchParams.set('pgbouncer', 'true');
    }
    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', '1');
    }
    if (!url.searchParams.has('sslmode')) {
      url.searchParams.set('sslmode', 'require');
    }

    return url.toString();
  } catch {
    return rawUrl;
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const normalizedUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);
    super(
      normalizedUrl
        ? {
            datasources: {
              db: { url: normalizedUrl }
            }
          }
        : undefined
    );
  }

  async onModuleInit() {
    await this.$connect();
  }
}

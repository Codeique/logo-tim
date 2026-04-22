import { Request, Response, NextFunction, RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';

function isJsonRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

export const auditLog = (entity: string, action: string): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res) as (body: unknown) => Response; // unavoidable: monkey-patch binding
    res.json = function (data: unknown): Response {
      const result = originalJson(data);
      if (req.user && res.statusCode >= 200 && res.statusCode < 300) {
        const body = isJsonRecord(data) ? data : null;
        const id = body && typeof body.id === 'number' ? body.id : undefined;
        const entityId = id ?? (req.params?.id ? parseInt(String(req.params.id)) : null);
        prisma.auditLog.create({
          data: {
            userId: req.user.id,
            action,
            entity,
            entityId: entityId ?? null,
            newValue: body ? (body as Prisma.InputJsonValue) : Prisma.JsonNull, // unavoidable: Record<string,unknown> ≠ InputJsonValue
            ipAddress: req.ip ?? null,
            userAgent: (req.headers['user-agent'] as string) ?? null,
          },
        }).catch(() => { /* silent */ });
      }
      return result;
    };
    next();
  };

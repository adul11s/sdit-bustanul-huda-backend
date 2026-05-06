import { prisma } from '../../../core/database/prisma.js';

export interface IBulletinRepository {
  findAll(category?: string, status?: string): Promise<unknown[]>;
  findById(id: string): Promise<unknown>;
  create(data: { title: string; content: string; authorId: string; image?: string; category?: string; eventDate?: Date; status?: string }): Promise<unknown>;
  update(id: string, data: { title?: string; content?: string; image?: string; category?: string; status?: string }): Promise<unknown>;
  delete(id: string): Promise<void>;
}

export class BulletinRepository implements IBulletinRepository {
  async findAll(cat?: string, stat?: string): Promise<unknown[]> {
    const where: Record<string, unknown> = {};
    if (cat) where.category = cat;
    if (stat) where.status = stat;
    return prisma.bulletin.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  async findById(id: string): Promise<unknown> {
    return prisma.bulletin.findUnique({
      where: { id },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  async create(data: { title: string; content: string; authorId: string; image?: string; category?: string; eventDate?: Date; status?: string }): Promise<unknown> {
    return prisma.bulletin.create({ data });
  }

  async update(id: string, data: { title?: string; content?: string; image?: string; category?: string; status?: string }): Promise<unknown> {
    return prisma.bulletin.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await prisma.bulletin.delete({ where: { id } });
  }
}

export const bulletinRepository = new BulletinRepository();
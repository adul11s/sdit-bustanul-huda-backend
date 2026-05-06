import type { IBulletinRepository } from '../interfaces/bulletin.repository.interface.js';

export interface IBulletinService {
  getAll(category?: string, status?: string): Promise<unknown[]>;
  getById(id: string): Promise<unknown>;
  create(data: { title: string; content: string; authorId: string; image?: string; category?: string; eventDate?: Date; status?: string }): Promise<unknown>;
  update(id: string, data: Partial<{ title: string; content: string; image: string; category: string; status: string }>): Promise<unknown>;
  delete(id: string): Promise<void>;
}

export class BulletinService implements IBulletinService {
  constructor(private readonly repository: IBulletinRepository) {}

  async getAll(category?: string, status?: string): Promise<unknown[]> {
    return this.repository.findAll(category, status);
  }

  async getById(id: string): Promise<unknown> {
    return this.repository.findById(id);
  }

  async create(data: { title: string; content: string; authorId: string; image?: string; category?: string; eventDate?: Date; status?: string }): Promise<unknown> {
    const bulletin = await this.repository.create(data);
    const { prisma } = await import('../../../core/database/prisma.js');
    const users = await prisma.user.findMany({ select: { id: true } });
    await prisma.notification.createMany({
      data: users.map(u => ({
        userId: u.id,
        type: 'BULLETIN',
        title: data.title,
        message: data.content.substring(0, 100),
      })),
    });
    return bulletin;
  }

  async update(id: string, data: Partial<{ title: string; content: string; image: string; category: string; status: string }>): Promise<unknown> {
    return this.repository.update(id, data);
  }

  async delete(id: string): Promise<void> {
    return this.repository.delete(id);
  }
}
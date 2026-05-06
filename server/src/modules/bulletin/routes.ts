import { Router, Request, Response } from 'express';
import { BulletinService } from '../services/bulletin.service.js';
import { bulletinRepository } from '../repositories/bulletin.repository.js';
import { successResponse, errorResponse, createdResponse } from '../../../core/utils/response.js';

const bulletinService = new BulletinService(bulletinRepository);
const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, status } = req.query;
    const bulletins = await bulletinService.getAll(category as string, status as string);
    successResponse(res, bulletins);
  } catch (error) {
    errorResponse(res, 500, 'Internal server error');
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const bulletin = await bulletinService.getById(req.params.id);
    successResponse(res, bulletin);
  } catch (error) {
    errorResponse(res, 500, 'Internal server error');
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user: { userId: string } }).user?.userId;
    const bulletin = await bulletinService.create({ ...req.body, authorId: userId });
    createdResponse(res, bulletin);
  } catch (error) {
    errorResponse(res, 500, 'Internal server error');
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const bulletin = await bulletinService.update(req.params.id, req.body);
    successResponse(res, bulletin);
  } catch (error) {
    errorResponse(res, 500, 'Internal server error');
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await bulletinService.delete(req.params.id);
    successResponse(res, { success: true }, 'Bulletin deleted');
  } catch (error) {
    errorResponse(res, 500, 'Internal server error');
  }
});

export default router;
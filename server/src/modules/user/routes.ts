import { Router, Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service.js';
import { userRepository } from '../repositories/user.repository.js';
import { UserController } from '../controllers/user.controller.js';

const userService = new UserService(userRepository);
const userController = new UserController(userService);

const router = Router();

router.get('/', (req, res, next) => userController.findAll(req, res, next));
router.get('/stats', (req, res, next) => userController.getStats(req, res, next));
router.get('/:id', (req, res, next) => userController.findById(req, res, next));
router.post('/', (req, res, next) => userController.create(req, res, next));
router.patch('/:id', (req, res, next) => userController.update(req, res, next));
router.delete('/:id', (req, res, next) => userController.delete(req, res, next));
router.post('/:id/activate', (req, res, next) => userController.activate(req, res, next));

export default router;
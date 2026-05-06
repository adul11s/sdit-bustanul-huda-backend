import { Router, Request, Response } from 'express';
import { FinanceService } from '../services/finance.service.js';
import { financeRepository } from '../repositories/finance.repository.js';
import { successResponse, errorResponse, createdResponse } from '../../../core/utils/response.js';

const financeService = new FinanceService(financeRepository);
const router = Router();

router.get('/invoices', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '10', status, studentId } = req.query;
    const result = await financeService.getInvoices(studentId as string, status as string, Number(page), Number(limit));
    successResponse(res, result);
  } catch (error) {
    errorResponse(res, 500, 'Internal server error');
  }
});

router.get('/invoices/:id', async (req: Request, res: Response) => {
  try {
    const invoice = await financeService.getInvoiceById(req.params.id);
    successResponse(res, invoice);
  } catch (error) {
    errorResponse(res, 500, 'Internal server error');
  }
});

router.post('/invoices', async (req: Request, res: Response) => {
  try {
    const invoice = await financeService.createInvoice(req.body);
    createdResponse(res, invoice);
  } catch (error) {
    errorResponse(res, 500, 'Internal server error');
  }
});

router.put('/invoices/:id', async (req: Request, res: Response) => {
  try {
    const invoice = await financeService.updateInvoice(req.params.id, req.body);
    successResponse(res, invoice);
  } catch (error) {
    errorResponse(res, 500, 'Internal server error');
  }
});

router.delete('/invoices/:id', async (req: Request, res: Response) => {
  try {
    await financeService.deleteInvoice(req.params.id);
    successResponse(res, { success: true }, 'Invoice deleted');
  } catch (error) {
    errorResponse(res, 500, 'Internal server error');
  }
});

router.post('/payments', async (req: Request, res: Response) => {
  try {
    const payment = await financeService.processPayment(req.body);
    createdResponse(res, payment);
  } catch (error) {
    errorResponse(res, 500, 'Internal server error');
  }
});

router.get('/payments/student/:studentId', async (req: Request, res: Response) => {
  try {
    const payments = await financeService.getPaymentHistory(req.params.studentId);
    successResponse(res, payments);
  } catch (error) {
    errorResponse(res, 500, 'Internal server error');
  }
});

router.get('/reports', async (req: Request, res: Response) => {
  try {
    const { year, month } = req.query;
    const report = await financeService.getFinancialReport(year ? Number(year) : undefined, month ? Number(month) : undefined);
    successResponse(res, report);
  } catch (error) {
    errorResponse(res, 500, 'Internal server error');
  }
});

router.get('/overdue', async (req: Request, res: Response) => {
  try {
    const overdue = await financeService.getOverdueInvoices();
    successResponse(res, overdue);
  } catch (error) {
    errorResponse(res, 500, 'Internal server error');
  }
});

router.post('/invoices/:id/mark-paid', async (req: Request, res: Response) => {
  try {
    const invoice = await financeService.markAsPaid(req.params.id);
    successResponse(res, invoice, 'Invoice marked as paid');
  } catch (error) {
    errorResponse(res, 500, 'Internal server error');
  }
});

export default router;
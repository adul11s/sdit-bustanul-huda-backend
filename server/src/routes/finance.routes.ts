import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { paymentService } from '../services/payment.service.js';
import { roleMiddleware } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { validateBody } from '../middleware/validation.js';
import prisma from '../utils/prisma.js';

const processPaymentSchema = z.object({
  invoiceId: z.string().cuid().optional(),
  studentId: z.string().cuid(),
  amount: z.number().positive(),
  method: z.string().optional(),
  note: z.string().optional(),
});

const router = Router();

router.use(roleMiddleware(['FINANCE', 'ADMIN']));

// ─── Invoices ───────────────────────────────────────────────

router.get('/invoices', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '10', status, studentId } = req.query;
    const result = await paymentService.getInvoices(studentId as string, status as string, Number(page), Number(limit));
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

router.get('/invoices/:id', async (req: Request, res: Response) => {
  try {
    const invoice = await paymentService.getInvoiceById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }
    res.json({ success: true, data: invoice });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

router.post('/invoices', auditLog('CREATE', 'Invoice'), async (req: Request, res: Response) => {
  try {
    const invoice = await paymentService.createInvoice(req.body);
    res.json({ success: true, data: invoice });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

router.post('/invoices/targeted', auditLog('CREATE', 'Invoice'), async (req: Request, res: Response) => {
  try {
    const { targetType, classId, studentIds, title, description, amount, type, dueDate } = req.body;
    if (!title || !amount || !dueDate) {
      return res.status(400).json({ success: false, error: 'Missing required fields: title, amount, dueDate' });
    }
    const parsedDueDate = new Date(dueDate);

    let invoices;
    if (targetType === 'CLASS') {
      if (!classId) return res.status(400).json({ success: false, error: 'classId is required for CLASS target' });
      invoices = await paymentService.createInvoicesForClass({ classId, title, description, amount, type: type || 'TUITION', dueDate: parsedDueDate });
    } else if (targetType === 'STUDENT') {
      if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ success: false, error: 'studentIds array is required for STUDENT target' });
      }
      invoices = await paymentService.createInvoicesForStudents({ studentIds, title, description, amount, type: type || 'TUITION', dueDate: parsedDueDate });
    } else {
      return res.status(400).json({ success: false, error: 'Invalid targetType. Use CLASS or STUDENT' });
    }

    res.json({ success: true, data: invoices, count: invoices.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

router.put('/invoices/:id', auditLog('UPDATE', 'Invoice', (req) => req.params.id), async (req: Request, res: Response) => {
  try {
    const invoice = await paymentService.updateInvoice(req.params.id, req.body);
    res.json({ success: true, data: invoice });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

router.delete('/invoices/:id', auditLog('DELETE', 'Invoice', (req) => req.params.id), async (req: Request, res: Response) => {
  try {
    await paymentService.deleteInvoice(req.params.id);
    res.json({ success: true, message: 'Invoice deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

// ─── Payments ───────────────────────────────────────────────

router.post('/payments', validateBody(processPaymentSchema), auditLog('CREATE', 'Payment'), async (req: Request, res: Response) => {
  try {
    const payment = await paymentService.processPayment(req.body);
    res.json({ success: true, data: payment });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message || 'Internal server error' });
  }
});

router.get('/invoices/:id/payments', async (req: Request, res: Response) => {
  try {
    const payments = await paymentService.getInvoicePayments(req.params.id);
    res.json({ success: true, data: payments });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

router.get('/payments/student/:studentId', async (req: Request, res: Response) => {
  try {
    const payments = await paymentService.getPaymentHistory(req.params.studentId);
    res.json({ success: true, data: payments });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

// ─── Reports ────────────────────────────────────────────────

router.get('/reports', async (req: Request, res: Response) => {
  try {
    const { year, month } = req.query;
    const report = await paymentService.getFinancialReport(year ? Number(year) : undefined, month ? Number(month) : undefined);
    res.json({ success: true, data: report });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

router.get('/overdue', async (req: Request, res: Response) => {
  try {
    const overdue = await paymentService.getOverdueInvoices();
    res.json({ success: true, data: overdue });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

// ─── Bulk / Legacy ──────────────────────────────────────────

router.post('/invoices/bulk', auditLog('CREATE', 'Invoice'), async (req: Request, res: Response) => {
  try {
    const { studentIds, title, amount, type, dueDate } = req.body;
    const invoices = await paymentService.generateBulkInvoice(studentIds, title, amount, type, new Date(dueDate));
    res.json({ success: true, data: invoices });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

// ─── Reference Data (read-only, for invoice targeting) ──────

router.get('/classes', async (req: Request, res: Response) => {
  try {
    const levels = await prisma.classLevel.findMany({
      orderBy: { name: 'asc' },
      include: {
        classes: {
          select: {
            id: true,
            name: true,
            homeroomTeacher: {
              select: {
                user: { select: { name: true } },
              },
            },
            _count: { select: { students: true } },
          },
        },
      },
    });
    res.json({ success: true, data: levels });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

router.get('/students', async (req: Request, res: Response) => {
  try {
    const students = await prisma.student.findMany({
      where: { classId: { not: null } },
      select: {
        id: true,
        user: { select: { name: true } },
        class: { select: { name: true, level: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ success: true, data: students });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

// ─── Applicant inquiries ────────────────────────────────────

router.get('/inquiries', async (req: Request, res: Response) => {
  try {
    const inquiries = await prisma.inquiry.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: inquiries });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

router.post('/inquiries/:id/status', async (req: Request, res: Response) => {
  try {
    const inquiry = await prisma.inquiry.update({
      where: { id: req.params.id },
      data: { status: req.body.status },
    });
    res.json({ success: true, data: inquiry });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

// ─── Data Repair ────────────────────────────────────────────

router.post('/repair-invoice-statuses', auditLog('UPDATE', 'Invoice'), async (req: Request, res: Response) => {
  try {
    const fixed = await paymentService.repairInvoiceStatuses();
    res.json({ success: true, message: `Repaired ${fixed} invoice(s)`, fixed });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

export default router;

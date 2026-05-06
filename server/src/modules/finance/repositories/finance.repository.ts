import { prisma } from '../../../core/database/prisma.js';

export interface IFinanceRepository {
  getInvoices(studentId?: string, status?: string, page?: number, limit?: number): Promise<unknown[]>;
  getInvoiceById(id: string): Promise<unknown>;
  createInvoice(data: { studentId: string; title: string; amount: number; type: string; dueDate: Date }): Promise<unknown>;
  updateInvoice(id: string, data: Partial<{ title: string; amount: number; status: string }>): Promise<unknown>;
  deleteInvoice(id: string): Promise<void>;
  processPayment(data: { invoiceId?: string; studentId: string; amount: number; method?: string; note?: string }): Promise<unknown>;
  getPaymentHistory(studentId: string): Promise<unknown[]>;
  getFinancialReport(year?: number, month?: number): Promise<unknown>;
  getOverdueInvoices(): Promise<unknown[]>;
}

export class FinanceRepository implements IFinanceRepository {
  async getInvoices(studentId?: string, status?: string, page = 1, limit = 10): Promise<unknown[]> {
    const where: Record<string, unknown> = {};
    if (studentId) where.studentId = studentId;
    if (status) where.status = status;
    return prisma.invoice.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { student: { include: { user: true } }, payments: true },
    });
  }

  async getInvoiceById(id: string): Promise<unknown> {
    return prisma.invoice.findUnique({
      where: { id },
      include: { student: { include: { user: true, class: true } }, payments: true },
    });
  }

  async createInvoice(data: { studentId: string; title: string; amount: number; type: string; dueDate: Date }): Promise<unknown> {
    return prisma.invoice.create({ data });
  }

  async updateInvoice(id: string, data: Partial<{ title: string; amount: number; status: string }>): Promise<unknown> {
    return prisma.invoice.update({ where: { id }, data });
  }

  async deleteInvoice(id: string): Promise<void> {
    await prisma.invoice.delete({ where: { id } });
  }

  async processPayment(data: { invoiceId?: string; studentId: string; amount: number; method?: string; note?: string }): Promise<unknown> {
    if (data.invoiceId) {
      const invoice = await prisma.invoice.findUnique({ where: { id: data.invoiceId } });
      if (invoice) {
        const newPaidAmount = invoice.paidAmount + data.amount;
        const newStatus = newPaidAmount >= invoice.amount ? 'PAID' : newPaidAmount > 0 ? 'PARTIAL' : 'UNPAID';
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { paidAmount: newPaidAmount, status: newStatus as 'PAID', paidAt: newStatus === 'PAID' ? new Date() : null },
        });
      }
    }
    const payment = await prisma.payment.create({ data });
    if (data.invoiceId) {
      const student = await prisma.student.findUnique({ where: { id: data.studentId } });
      if (student) {
        await prisma.notification.create({
          data: { userId: student.userId, type: 'PAYMENT', title: 'Payment Received', message: `Payment of ${data.amount} has been received` },
        });
      }
    }
    return payment;
  }

  async getPaymentHistory(studentId: string): Promise<unknown[]> {
    return prisma.payment.findMany({
      where: { studentId },
      include: { invoice: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFinancialReport(year?: number, month?: number): Promise<unknown> {
    const where: Record<string, unknown> = {};
    if (year) where.year = year;
    if (month) where.month = month;
    const [invoices, payments] = await Promise.all([
      prisma.invoice.findMany({ where, include: { student: { include: { user: true } } } }),
      prisma.payment.findMany({ where: { createdAt: { gte: new Date(new Date().setDate(1)) } }, include: { student: { include: { user: true } } } }),
    ]);
    const totalExpected = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const totalCollected = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    return { totalExpected, totalCollected, totalOutstanding: totalExpected - totalCollected, recentPayments: payments.slice(0, 10) };
  }

  async getOverdueInvoices(): Promise<unknown[]> {
    return prisma.invoice.findMany({
      where: { status: { in: ['UNPAID', 'PARTIAL'] }, dueDate: { lt: new Date() } },
      include: { student: { include: { user: true, class: true } } },
      orderBy: { dueDate: 'asc' },
    });
  }
}

export const financeRepository = new FinanceRepository();
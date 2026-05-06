import type { IFinanceRepository } from '../interfaces/finance.repository.interface.js';

export interface IFinanceService {
  getInvoices(studentId?: string, status?: string, page?: number, limit?: number): Promise<unknown[]>;
  getInvoiceById(id: string): Promise<unknown>;
  createInvoice(data: { studentId: string; title: string; amount: number; type: string; dueDate: Date }): Promise<unknown>;
  updateInvoice(id: string, data: Partial<{ title: string; amount: number; status: string }>): Promise<unknown>;
  deleteInvoice(id: string): Promise<void>;
  processPayment(data: { invoiceId?: string; studentId: string; amount: number; method?: string; note?: string }): Promise<unknown>;
  getPaymentHistory(studentId: string): Promise<unknown[]>;
  getFinancialReport(year?: number, month?: number): Promise<unknown>;
  getOverdueInvoices(): Promise<unknown[]>;
  markAsPaid(invoiceId: string): Promise<unknown>;
  generateBulkInvoice(studentIds: string[], title: string, amount: number, type: string, dueDate: Date): Promise<unknown[]>;
}

export class FinanceService implements IFinanceService {
  constructor(private readonly repository: IFinanceRepository) {}

  async getInvoices(studentId?: string, status?: string, page = 1, limit = 10): Promise<unknown[]> {
    return this.repository.getInvoices(studentId, status, page, limit);
  }

  async getInvoiceById(id: string): Promise<unknown> {
    return this.repository.getInvoiceById(id);
  }

  async createInvoice(data: { studentId: string; title: string; amount: number; type: string; dueDate: Date }): Promise<unknown> {
    return this.repository.createInvoice(data);
  }

  async updateInvoice(id: string, data: Partial<{ title: string; amount: number; status: string }>): Promise<unknown> {
    return this.repository.updateInvoice(id, data);
  }

  async deleteInvoice(id: string): Promise<void> {
    return this.repository.deleteInvoice(id);
  }

  async processPayment(data: { invoiceId?: string; studentId: string; amount: number; method?: string; note?: string }): Promise<unknown> {
    return this.repository.processPayment(data);
  }

  async getPaymentHistory(studentId: string): Promise<unknown[]> {
    return this.repository.getPaymentHistory(studentId);
  }

  async getFinancialReport(year?: number, month?: number): Promise<unknown> {
    return this.repository.getFinancialReport(year, month);
  }

  async getOverdueInvoices(): Promise<unknown[]> {
    return this.repository.getOverdueInvoices();
  }

  async markAsPaid(invoiceId: string): Promise<unknown> {
    const { prisma } = await import('../../../core/database/prisma.js');
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    return prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'PAID', paidAmount: invoice!.amount, paidAt: new Date() },
    });
  }

  async generateBulkInvoice(studentIds: string[], title: string, amount: number, type: string, dueDate: Date): Promise<unknown[]> {
    const { prisma } = await import('../../../core/database/prisma.js');
    const invoices = [];
    for (const studentId of studentIds) {
      const existing = await prisma.invoice.findFirst({ where: { studentId, title, type: type as 'TUITION' } });
      if (!existing) {
        const invoice = await prisma.invoice.create({ data: { studentId, title, amount, type: type as 'TUITION', dueDate } });
        invoices.push(invoice);
      }
    }
    return invoices;
  }
}
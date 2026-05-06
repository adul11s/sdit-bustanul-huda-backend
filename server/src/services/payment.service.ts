import prisma from '../utils/prisma.js';
import type { CreateInvoiceDto, CreatePaymentDto, PaginatedResponse } from '../types/index.js';

function calculateStatus(paidAmount: number, amount: number): 'UNPAID' | 'PARTIAL' | 'PAID' {
  if (paidAmount >= amount) return 'PAID';
  if (paidAmount > 0) return 'PARTIAL';
  return 'UNPAID';
}

function normalizeInvoice(inv: any) {
  if (!inv) return inv;
  const correctStatus = calculateStatus(inv.paidAmount, inv.amount);
  if (inv.status !== correctStatus) {
    inv.status = correctStatus;
  }
  return inv;
}

export class PaymentService {
  async getInvoices(studentId?: string, status?: string, page = 1, limit = 10): Promise<PaginatedResponse> {
    const where: any = {};
    if (studentId) where.studentId = studentId;

    // Fetch all matching invoices (Prisma cannot compare two columns in WHERE)
    const allInvoices = await prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { student: { include: { user: { select: { id: true, name: true } }, class: { include: { level: true } } } }, payments: { orderBy: { createdAt: 'desc' } } },
    });

    // Normalize status based on actual paidAmount vs amount
    allInvoices.forEach(normalizeInvoice);

    // Filter in-memory by calculated status
    let filtered = allInvoices;
    if (status) {
      filtered = allInvoices.filter((inv) => inv.status === status);
    }

    // Paginate manually
    const total = filtered.length;
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return {
      success: true,
      data: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getInvoiceById(id: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        student: { include: { user: { select: { id: true, name: true } }, class: { include: { level: true } } } },
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });
    return normalizeInvoice(invoice);
  }

  async createInvoice(data: CreateInvoiceDto) {
    return prisma.invoice.create({ data });
  }

  async createInvoicesForClass(data: {
    title: string;
    description?: string;
    amount: number;
    type: string;
    dueDate: Date;
    classId: string;
  }) {
    const students = await prisma.student.findMany({
      where: { classId: data.classId },
      select: { id: true },
    });

    const invoices = [];
    for (const student of students) {
      const invoice = await prisma.invoice.create({
        data: {
          studentId: student.id,
          title: data.title,
          description: data.description,
          amount: data.amount,
          type: data.type as any,
          dueDate: data.dueDate,
        },
      });
      invoices.push(invoice);
    }

    return invoices;
  }

  async createInvoicesForStudents(data: {
    title: string;
    description?: string;
    amount: number;
    type: string;
    dueDate: Date;
    studentIds: string[];
  }) {
    const invoices = [];
    for (const studentId of data.studentIds) {
      const invoice = await prisma.invoice.create({
        data: {
          studentId,
          title: data.title,
          description: data.description,
          amount: data.amount,
          type: data.type as any,
          dueDate: data.dueDate,
        },
      });
      invoices.push(invoice);
    }
    return invoices;
  }

  async updateInvoice(id: string, data: Partial<CreateInvoiceDto>) {
    return prisma.invoice.update({ where: { id }, data });
  }

  async deleteInvoice(id: string) {
    return prisma.invoice.delete({ where: { id } });
  }

  async processPayment(data: CreatePaymentDto & { paymentDate?: string }) {
    const result = await prisma.$transaction(async (tx) => {
      const invoice = data.invoiceId
        ? await tx.invoice.findUnique({ where: { id: data.invoiceId } })
        : null;

      if (invoice) {
        const remaining = invoice.amount - invoice.paidAmount;
        if (data.amount > remaining) {
          throw new Error(`Payment amount (${data.amount}) exceeds remaining balance (${remaining}). Overpayment is not allowed.`);
        }

        const newPaidAmount = invoice.paidAmount + data.amount;
        const newStatus = calculateStatus(newPaidAmount, invoice.amount);

        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            paidAmount: newPaidAmount,
            status: newStatus,
            paidAt: newStatus === 'PAID' ? new Date() : invoice.paidAt,
          },
        });
      }

      const payment = await tx.payment.create({
        data: {
          invoiceId: data.invoiceId,
          studentId: data.studentId,
          amount: data.amount,
          method: data.method,
          note: data.note,
          paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
        },
      });

      if (invoice) {
        const student = await tx.student.findUnique({ where: { id: data.studentId }, include: { user: true } });
        if (student) {
          await tx.notification.create({
            data: {
              userId: student.userId,
              type: 'PAYMENT',
              title: 'Payment Received',
              message: `Payment of ${data.amount} has been received for invoice "${invoice.title}"`,
            },
          });
        }
      }

      return payment;
    });

    return result;
  }

  async getPaymentHistory(studentId: string) {
    return prisma.payment.findMany({
      where: { studentId },
      include: { invoice: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInvoicePayments(invoiceId: string) {
    return prisma.payment.findMany({
      where: { invoiceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFinancialReport(year?: number, month?: number) {
    const where: any = {};
    if (year) where.year = year;
    if (month) where.month = month;

    const [invoices, payments] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: { student: { include: { user: { select: { name: true } } } } },
      }),
      prisma.payment.findMany({
        where: { createdAt: { gte: new Date(new Date().setDate(1)) } },
        include: { student: { include: { user: { select: { name: true } } } } },
      }),
    ]);

    invoices.forEach(normalizeInvoice);

    const totalExpected = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const totalCollected = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const totalOutstanding = totalExpected - totalCollected;
    const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

    return {
      totalInvoices: invoices.length,
      totalExpected,
      totalCollected,
      totalOutstanding,
      collectionRate: Math.round(collectionRate * 100) / 100,
      recentPayments: payments.slice(0, 10),
    };
  }

  async getStudentFinancialSummary(studentId: string) {
    const invoices = await prisma.invoice.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });

    invoices.forEach(normalizeInvoice);

    const totalBilled = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const unpaidInvoices = invoices.filter(inv => inv.status !== 'PAID');
    const totalOutstanding = totalBilled - totalPaid;

    return {
      totalBilled,
      totalPaid,
      totalOutstanding,
      unpaidCount: unpaidInvoices.length,
      invoices: invoices.slice(0, 5),
    };
  }

  async generateBulkInvoice(studentIds: string[], title: string, amount: number, type: string, dueDate: Date) {
    const invoices = [];
    for (const studentId of studentIds) {
      const existing = await prisma.invoice.findFirst({
        where: { studentId, title, type: type as any },
      });
      if (!existing) {
        const invoice = await prisma.invoice.create({
          data: { studentId, title, amount, type: type as any, dueDate },
        });
        invoices.push(invoice);
      }
    }
    return invoices;
  }

  async getOverdueInvoices() {
    const invoices = await prisma.invoice.findMany({
      where: { dueDate: { lt: new Date() } },
      include: { student: { include: { user: { select: { id: true, name: true } }, class: true } }, payments: true },
      orderBy: { dueDate: 'asc' },
    });
    invoices.forEach(normalizeInvoice);
    // Filter out fully paid invoices (paidAmount >= amount)
    return invoices.filter((inv) => inv.status !== 'PAID');
  }

  /**
   * One-time repair: recalculate and fix all invoice statuses based on paidAmount.
   * Returns count of fixed records.
   */
  async repairInvoiceStatuses() {
    const allInvoices = await prisma.invoice.findMany({ select: { id: true, paidAmount: true, amount: true, status: true } });
    let fixed = 0;
    for (const inv of allInvoices) {
      const correctStatus = calculateStatus(inv.paidAmount, inv.amount);
      if (inv.status !== correctStatus) {
        await prisma.invoice.update({
          where: { id: inv.id },
          data: { status: correctStatus },
        });
        fixed++;
      }
    }
    return fixed;
  }
}

export const paymentService = new PaymentService();

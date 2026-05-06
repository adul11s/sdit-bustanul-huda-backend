export interface Invoice {
  id: string;
  studentId: string;
  title: string;
  amount: number;
  type: string;
  status: string;
  dueDate: Date;
}

export interface Payment {
  id: string;
  invoiceId: string | null;
  studentId: string;
  amount: number;
  method: string | null;
  note: string | null;
  createdAt: Date;
}
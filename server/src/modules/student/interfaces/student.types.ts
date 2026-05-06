export interface ClassLevel {
  id: string;
  name: string;
}

export interface StudentBasic {
  id: string;
  userId: string;
  classId: string | null;
  user: {
    id: string;
    name: string;
    email: string;
  };
  class: {
    id: string;
    name: string;
    level: ClassLevel;
  } | null;
}

export interface StudentWithDetails extends StudentBasic {
  enrollments: Array<{
    id: string;
    subjectId: string;
    isActive: boolean;
    subject: {
      id: string;
      name: string;
      teacher: {
        id: string;
        user: { name: string };
      };
    };
  }>;
}

export interface Enrollment {
  id: string;
  studentId: string;
  subjectId: string;
  isActive: boolean;
  subject: {
    id: string;
    name: string;
    teacher: { user: { name: string } };
  };
}

export interface Assignment {
  id: string;
  title: string;
  content: string;
  dueDate: Date;
  subjectId: string;
}

export interface Grade {
  id: string;
  studentId: string;
  subjectId: string;
  value: number;
  comment: string | null;
}

export interface Attendance {
  id: string;
  studentId: string;
  date: Date;
  status: string;
}
export interface AcademicYear {
  id: string;
  name: string;
  isCurrent: boolean;
  startDate: Date;
  endDate: Date;
}

export interface ClassLevel {
  id: string;
  name: string;
}

export interface Class {
  id: string;
  name: string;
  levelId: string;
  level: ClassLevel;
  homeroomTeacherId: string | null;
}

export interface Subject {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  teacherId: string;
}

export interface Schedule {
  id: string;
  subjectId: string;
  classId: string;
  academicYearId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string | null;
}
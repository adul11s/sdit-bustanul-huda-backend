export interface TeacherProfile {
  id: string;
  userId: string;
  homeroomClassId: string | null;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface Subject {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  teacher: TeacherProfile;
}

export interface ClassLevel {
  id: string;
  name: string;
}

export interface ClassWithLevel {
  id: string;
  name: string;
  levelId: string;
  level: ClassLevel;
}
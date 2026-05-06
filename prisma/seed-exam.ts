import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding exam data...');

  // Get or create a teacher
  let teacher = await prisma.teacher.findFirst({
    include: { user: true }
  });

  if (!teacher) {
    const user = await prisma.user.findFirst({ where: { role: 'TEACHER' } });
    if (user) {
      teacher = await prisma.teacher.create({ data: { userId: user.id } });
    } else {
      console.log('No teacher found. Creating one...');
      const user = await prisma.user.create({
        data: {
          email: 'teacher@edupulse.com',
          password: '$2a$10$password123', // hash for password123
          name: 'John Teacher',
          role: 'TEACHER',
        }
      });
      teacher = await prisma.teacher.create({ data: { userId: user.id } });
    }
  }

  // Get or create a subject
  let subject = await prisma.subject.findFirst({
    where: { teacherId: teacher.id }
  });

  if (!subject) {
    subject = await prisma.subject.create({
      data: {
        name: 'Mathematics',
        code: 'MATH',
        description: 'Basic Math',
        teacherId: teacher.id,
      },
    });
  }

  console.log(`Using subject: ${subject.name}`);

  // Get or create a student
  let studentUser = await prisma.user.findFirst({ where: { role: 'STUDENT' } });
  if (!studentUser) {
    studentUser = await prisma.user.create({
      data: {
        email: 'student@edupulse.com',
        password: '$2a$10$password123',
        name: 'Jane Student',
        role: 'STUDENT',
      }
    });
  }

  let student = await prisma.student.findFirst({
    where: { userId: studentUser.id }
  });

  if (!student) {
    student = await prisma.student.create({ data: { userId: studentUser.id } });
    console.log(`Created student record for: ${studentUser.name}`);
  }

  // Enroll student in the subject
  const existingEnrollment = await prisma.enrollment.findFirst({
    where: { studentId: student.id, subjectId: subject.id }
  });

  if (!existingEnrollment) {
    await prisma.enrollment.create({
      data: { studentId: student.id, subjectId: subject.id }
    });
    console.log(`Enrolled student in: ${subject.name}`);
  }

  // Create exam
  const exam = await prisma.exam.upsert({
    where: { id: 'test-exam-1' },
    update: {},
    create: {
      id: 'test-exam-1',
      title: 'Mathematics Quiz - Week 1',
      description: 'A simple quiz to test your understanding of basic math',
      type: 'MCQ',
      subjectId: subject.id,
      timeLimit: 30,
      totalScore: 40,
      isPublished: true,
      createdById: teacher.id,
    },
  });

  console.log(`Created exam: ${exam.title}`);

  // Delete existing questions and create new ones
  await prisma.question.deleteMany({ where: { examId: exam.id } });

  const questions = [
    {
      text: 'What is 2 + 2?',
      type: 'MCQ',
      options: ['1', '2', '3', '4'],
      correctAnswer: 'D',
      score: 10,
      order: 1,
    },
    {
      text: 'What is 5 x 3?',
      type: 'MCQ',
      options: ['10', '12', '15', '20'],
      correctAnswer: 'C',
      score: 10,
      order: 2,
    },
    {
      text: 'What is 10 - 4?',
      type: 'MCQ',
      options: ['4', '5', '6', '7'],
      correctAnswer: 'C',
      score: 10,
      order: 3,
    },
    {
      text: 'What is 20 ÷ 2?',
      type: 'MCQ',
      options: ['5', '8', '10', '12'],
      correctAnswer: 'C',
      score: 10,
      order: 4,
    },
  ];

  for (const q of questions) {
    await prisma.question.create({
      data: {
        examId: exam.id,
        ...q,
      },
    });
  }

  console.log(`Created ${questions.length} questions`);

  // Create an essay assignment
  const essayExam = await prisma.exam.upsert({
    where: { id: 'test-essay-1' },
    update: {},
    create: {
      id: 'test-essay-1',
      title: 'Essay Assignment: My Favorite Subject',
      description: 'Write a short essay about your favorite subject and why you like it.',
      type: 'ESSAY',
      subjectId: subject.id,
      timeLimit: 60,
      totalScore: 50,
      isPublished: true,
      createdById: teacher.id,
    },
  });

  console.log(`Created exam: ${essayExam.title}`);

  // Delete existing questions and create essay question
  await prisma.question.deleteMany({ where: { examId: essayExam.id } });

  await prisma.question.create({
    data: {
      examId: essayExam.id,
      text: 'Write about your favorite school subject in at least 100 words. Explain what you enjoy learning and why.',
      type: 'ESSAY',
      correctAnswer: '',
      score: 50,
      order: 1,
    },
  });

  console.log('Essay question created');

  console.log('✅ Seed complete!');
  console.log(`\n📋 Test Credentials:`);
  console.log(`   Student: student@edupulse.com / password123`);
  console.log(`\n📝 Available Exams:`);
  console.log(`   1. ${exam.title} (MCQ - 4 questions, 40 points, 30 min)`);
  console.log(`   2. ${essayExam.title} (Essay - 1 question, 50 points, 60 min)`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
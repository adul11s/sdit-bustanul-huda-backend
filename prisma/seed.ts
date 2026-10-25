import { PrismaClient, Prisma, Gender, Role, AttendanceStatus, PaymentStatus, PaymentType, GradeCategory, ExamType, QuestionType, CalendarEventType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const PASSWORD_HASH = await bcrypt.hash('password123', 10);

const ACADEMIC_YEAR = {
  name: '2025/2026',
  isCurrent: true,
  startDate: new Date('2025-07-01'),
  endDate: new Date('2026-06-30'),
};

const CLASS_LEVELS = [
  { name: 'Grade 1' }, { name: 'Grade 2' }, { name: 'Grade 3' },
  { name: 'Grade 4' }, { name: 'Grade 5' }, { name: 'Grade 6' },
];

const SUBJECTS = [
  { name: 'Matematika', code: 'MAT' },
  { name: 'Bahasa Indonesia', code: 'BIND' },
  { name: 'IPA', code: 'IPA' },
  { name: 'IPS', code: 'IPS' },
  { name: 'PPKn', code: 'PPKn' },
  { name: 'Bahasa Inggris', code: 'BING' },
  { name: 'Seni Budaya', code: 'SENI' },
  { name: 'PJOK', code: 'PJOK' },
  { name: 'Pendidikan Agama Islam', code: 'PAI' },
];

const STUDENTS = [
  { name: 'Ahmad Fauzi', gender: Gender.MALE },
  { name: 'Siti Aminah', gender: Gender.FEMALE },
  { name: 'Budi Santoso', gender: Gender.MALE },
  { name: 'Dewi Lestari', gender: Gender.FEMALE },
  { name: 'Eko Prasetyo', gender: Gender.MALE },
  { name: 'Fatimah Zahra', gender: Gender.FEMALE },
  { name: 'Hendra Wijaya', gender: Gender.MALE },
  { name: 'Indah Permata', gender: Gender.FEMALE },
  { name: 'Joko Susilo', gender: Gender.MALE },
  { name: 'Kartika Sari', gender: Gender.FEMALE },
  { name: 'Lukman Hakim', gender: Gender.MALE },
  { name: 'Maya Indah', gender: Gender.FEMALE },
  { name: 'Nur Hidayah', gender: Gender.FEMALE },
  { name: 'Oscar Putra', gender: Gender.MALE },
  { name: 'Putri Anggraini', gender: Gender.FEMALE },
  { name: 'Rudi Hartono', gender: Gender.MALE },
  { name: 'Salsa Billa', gender: Gender.FEMALE },
  { name: 'Teguh Priyanto', gender: Gender.MALE },
  { name: 'Umi Kulsum', gender: Gender.FEMALE },
  { name: 'Vino Bastian', gender: Gender.MALE },
  { name: 'Wulan Sari', gender: Gender.FEMALE },
  { name: 'Yusuf Ibrahim', gender: Gender.MALE },
  { name: 'Zahra Aulia', gender: Gender.FEMALE },
  { name: 'Adi Nugroho', gender: Gender.MALE },
  { name: 'Bella Saphira', gender: Gender.FEMALE },
  { name: 'Citra Lestari', gender: Gender.FEMALE },
  { name: 'Dani Firmansyah', gender: Gender.MALE },
  { name: 'Elisa Purnama', gender: Gender.FEMALE },
  { name: 'Fajar Ramadhan', gender: Gender.MALE },
  { name: 'Gita Pramesti', gender: Gender.FEMALE },
];

const TEACHERS = [
  { name: 'Pak Budi Santoso, M.Pd.', subject: 'Matematika', email: 'budi.santoso@nurulislam.sch.id', homeroomClass: '1A', title: 'S.Pd, M.Pd', teachingStyle: 'Pendekatan konkret-piktorial-abstrak (CPA) untuk matematika visual dan praktis.', hobby: 'Catur, membaca sejarah matematika' },
  { name: 'Ibu Siti Aminah, S.Pd.', subject: 'Bahasa Indonesia', email: 'siti.aminah@nurulislam.sch.id', homeroomClass: '2A', title: 'S.Pd', teachingStyle: 'Mendorong siswa bercerita dan menulis kreatif melalui diskusi kelompok.', hobby: 'Menulis puisi, menenun' },
  { name: 'Pak Ahmad Rizki, S.Pd.', subject: 'IPA', email: 'ahmad.rizki@nurulislam.sch.id', homeroomClass: '3A', title: 'S.Pd', teachingStyle: 'Eksperimen sederhana di kelas dan luar ruangan untuk pembelajaran sains yang menyenangkan.', hobby: 'Berkebun, fotografi alam' },
  { name: 'Ibu Nur Hidayah, S.Pd.', subject: 'IPS', email: 'nur.hidayah@nurulislam.sch.id', homeroomClass: '4A', title: 'S.Pd', teachingStyle: 'Studi kasus lokal dan peran-peran untuk membuat IPS relevan dengan kehidupan sehari-hari.', hobby: 'Traveling, mengoleksi prangko' },
  { name: 'Pak Hendar Wijaya, M.Pd.', subject: 'PPKn', email: 'hendar.wijaya@nurulislam.sch.id', homeroomClass: '5A', title: 'S.Pd, M.Pd', teachingStyle: 'Membentuk karakter bangsa melalui diskusi nilai-nilai luhur dan simulasi demokrasi.', hobby: 'Mendaki gunung, membaca biografi' },
  { name: 'Ibu Maria Lestari, S.Pd.', subject: 'Bahasa Inggris', email: 'maria.lestari@nurulislam.sch.id', homeroomClass: '6A', title: 'S.Pd', teachingStyle: 'English should be fun! Menggunakan lagu, permainan peran, dan cerita.', hobby: 'Menonton film, baking' },
  { name: 'Ibu Dewi Permata, S.Sn.', subject: 'Seni Budaya', email: 'dewi.permata@nurulislam.sch.id', title: 'S.Sn', teachingStyle: 'Setiap anak adalah seniman. Ruang ekspresi bebas melalui musik, tari, dan kerajinan.', hobby: 'Melukis, bermain gamelan' },
  { name: 'Pak Joko Susilo, S.Or.', subject: 'PJOK', email: 'joko.susilo@nurulislam.sch.id', title: 'S.Or', teachingStyle: 'Olahraga tradisional dan modern untuk kebugaran holistik.', hobby: 'Maraton, memancing' },
  { name: 'Ustadz Lukman Hakim', subject: 'Pendidikan Agama Islam', email: 'lukman.hakim@nurulislam.sch.id', title: 'S.Ag', teachingStyle: 'Membumikan nilai-nilai Islam melalui cerita, hafalan, dan praktik ibadah.', hobby: 'Khat, berkebun sayur' },
];

const TIME_SLOTS = [
  { start: '07:30', end: '09:30' },
  { start: '09:30', end: '11:30' },
  { start: '13:00', end: '15:00' },
];

const FRIDAY_SLOTS = [
  { start: '07:30', end: '09:30' },
  { start: '09:30', end: '11:30' },
];

async function main() {
  console.log('🌱 Starting comprehensive seed...\n');

  // Cleanup
  console.log('🧹 Cleaning data...');
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.studentAnswer.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.question.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.assignmentSubmission.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.promotionHistory.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.bulletinMedia.deleteMany();
  await prisma.bulletin.deleteMany();
  await prisma.inquiry.deleteMany();
  await prisma.calendarEvent.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.classTransferHistory.deleteMany();
  await prisma.student.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.class.deleteMany();
  await prisma.classLevel.deleteMany();
  await prisma.academicYear.deleteMany();
  await prisma.user.deleteMany();
  console.log('✅ Cleanup complete\n');

  // Academic Year
  const academicYear = await prisma.academicYear.create({ data: ACADEMIC_YEAR });
  console.log(`📅 Academic Year: ${academicYear.name}`);

  // Class Levels
  const classLevels = [];
  for (const cl of CLASS_LEVELS) {
    classLevels.push(await prisma.classLevel.create({ data: cl }));
  }
  console.log(`📚 ${classLevels.length} Class Levels created`);

  // Classes
  const classes = [];
  for (let i = 0; i < classLevels.length; i++) {
    classes.push(await prisma.class.create({
      data: { name: `${i + 1}A`, levelId: classLevels[i].id },
    }));
  }
  console.log(`🏫 ${classes.length} Classes created`);

  // Admin
  const adminUser = await prisma.user.create({
    data: { email: 'admin@nurulislam.sch.id', password: PASSWORD_HASH, name: 'Super Admin', role: Role.ADMIN, isActive: true },
  });
  console.log(`👤 Admin: ${adminUser.email}`);

  // Finance
  const financeUser = await prisma.user.create({
    data: { email: 'finance@nurulislam.sch.id', password: PASSWORD_HASH, name: 'Bendahara Sekolah', role: Role.FINANCE, isActive: true },
  });
  console.log(`💰 Finance: ${financeUser.email}`);

  // Teachers
  const teachers = [];
  const teacherUsers = [];
  for (const [i, t] of TEACHERS.entries()) {
    const user = await prisma.user.create({
      data: { email: t.email, password: PASSWORD_HASH, name: t.name, role: i < 6 ? Role.HOMEROOM_TEACHER : Role.TEACHER, title: t.title, teachingStyle: t.teachingStyle, hobby: t.hobby, isActive: true },
    });
    const teacher = await prisma.teacher.create({ data: { userId: user.id } });
    teachers.push({ ...teacher, user, subjectName: t.subject, homeroomClassName: t.homeroomClass });
    teacherUsers.push(user);
  }
  console.log(`👨‍🏫 ${teachers.length} Teachers created`);

  // Assign homeroom teachers to classes
  for (let i = 0; i < 6 && i < classes.length; i++) {
    await prisma.class.update({
      where: { id: classes[i].id },
      data: { homeroomTeacherId: teachers[i].id },
    });
  }
  console.log('🏫 Homeroom teachers assigned\n');

  // Students
  const students = [];
  const studentUsers = [];
  for (let i = 0; i < STUDENTS.length; i++) {
    const s = STUDENTS[i];
    const classIdx = Math.floor(i / 5);
    const user = await prisma.user.create({
      data: { email: `siswa${i + 1}@nurulislam.sch.id`, password: PASSWORD_HASH, name: s.name, role: Role.STUDENT, gender: s.gender, isActive: true },
    });
    const student = await prisma.student.create({
      data: { userId: user.id, classId: classes[classIdx]?.id || classes[0].id },
    });
    students.push({ ...student, user, class: classes[classIdx] || classes[0] });
    studentUsers.push(user);
  }
  console.log(`👨‍🎓 ${students.length} Students created`);

  // Subjects
  const subjects = [];
  for (let i = 0; i < SUBJECTS.length; i++) {
    const s = SUBJECTS[i];
    const teacherId = teachers[i % teachers.length].id;
    subjects.push(await prisma.subject.create({
      data: { name: s.name, code: s.code, teacherId },
    }));
  }
  console.log(`📖 ${subjects.length} Subjects created\n`);

  // Enrollments
  let enrollmentCount = 0;
  for (const student of students) {
    for (const subject of subjects) {
      await prisma.enrollment.create({
        data: { studentId: student.id, subjectId: subject.id, isActive: true },
      });
      enrollmentCount++;
    }
  }
  console.log(`🔗 ${enrollmentCount} Enrollments created`);

  // Schedules
  let scheduleCount = 0;
  for (const cls of classes) {
    const clsSubjects = subjects;
    let slotIndex = 0;
    for (let day = 1; day <= 5; day++) {
      const slots = day === 5 ? FRIDAY_SLOTS : TIME_SLOTS;
      for (const slot of slots) {
        const subject = clsSubjects[slotIndex % clsSubjects.length];
        const hasSchedule = await prisma.schedule.findFirst({
          where: { subjectId: subject.id, dayOfWeek: day, startTime: slot.start },
        });
        if (!hasSchedule) {
          await prisma.schedule.create({
            data: {
              subjectId: subject.id,
              classId: cls.id,
              academicYearId: academicYear.id,
              dayOfWeek: day,
              startTime: slot.start,
              endTime: slot.end,
              room: `R-${cls.name}-${slotIndex + 1}`,
            },
          });
          scheduleCount++;
        }
        slotIndex++;
      }
    }
  }
  console.log(`📅 ${scheduleCount} Schedules created`);

  // Assignments
  const assignments = [];
  const assignmentTitles = ['Tugas Latihan', 'PR Mingguan', 'Proyek Kelompok', 'Ulangan Harian', 'Tugas Mandiri', 'Lembar Kerja'];
  for (const subject of subjects) {
    for (let i = 0; i < 4; i++) {
      const targetClass = classes[i % classes.length];
      assignments.push(await prisma.assignment.create({
        data: {
          title: `${assignmentTitles[i]} ${subject.name}`,
          content: `Kerjakan soal-soal ${subject.name} pada buku pelajaran halaman ${10 + i * 5}-${15 + i * 5}.`,
          dueDate: new Date(2026, 3, 20 + i),
          points: 100,
          subjectId: subject.id,
          targetType: 'CLASS',
          classId: targetClass.id,
          category: GradeCategory.ASSIGNMENT,
        },
      }));
    }
  }
  console.log(`📝 ${assignments.length} Assignments created`);

  // Assignment Submissions
  let assignmentSubCount = 0;
  for (const assignment of assignments) {
    const classStudents = students.filter(s => s.classId === assignment.classId);
    for (const student of classStudents.slice(0, 3)) {
      const statuses = ['NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'GRADED'];
      const status = statuses[Math.floor(Math.random() * 3) + 1] as any;
      await prisma.assignmentSubmission.create({
        data: {
          assignmentId: assignment.id,
          studentId: student.id,
          content: status !== 'NOT_STARTED' ? `<p>Jawaban ${student.user.name} untuk ${assignment.title}:</p><p>Saya telah mengerjakan tugas ini dengan sungguh-sungguh.</p>` : null,
          status,
          submittedAt: status === 'SUBMITTED' || status === 'GRADED' ? new Date(2026, 3, 19) : null,
          score: status === 'GRADED' ? 70 + Math.floor(Math.random() * 25) : null,
        },
      });
      assignmentSubCount++;
    }
  }
  console.log(`📤 ${assignmentSubCount} Assignment Submissions created`);

  // Exams
  const exams = [];
  const examTitles = ['Ujian Tengah Semester', 'Ujian Akhir Semester', 'Ulangan Harian'];
  for (const subject of subjects) {
    for (let i = 0; i < 2; i++) {
      const targetClass = classes[i % classes.length];
      exams.push(await prisma.exam.create({
        data: {
          title: `${examTitles[i]} ${subject.name}`,
          description: `Ujian ${subject.name} untuk kelas ${targetClass.name}`,
          type: ExamType.MCQ,
          subjectId: subject.id,
          timeLimit: 60,
          totalScore: 100,
          isPublished: true,
          isActive: true,
          createdById: teachers[0].id,
          targetType: 'CLASS',
          classId: targetClass.id,
          category: i === 0 ? GradeCategory.MIDTERM : GradeCategory.FINAL,
        },
      }));
    }
  }
  console.log(`📝 ${exams.length} Exams created`);

  // Questions for exams
  let questionCount = 0;
  for (const exam of exams) {
    for (let i = 0; i < 5; i++) {
      const options = ['A', 'B', 'C', 'D'];
      await prisma.question.create({
        data: {
          examId: exam.id,
          text: `Soal nomor ${i + 1} untuk ${exam.title}`,
          type: QuestionType.MCQ,
          options: JSON.stringify(options),
          correctAnswer: options[i % 4],
          score: 20,
          order: i,
        },
      });
      questionCount++;
    }
  }
  console.log(`❓ ${questionCount} Questions created`);

  // Exam Submissions
  let examSubCount = 0;
  for (const exam of exams) {
    const classStudents = students.filter(s => s.classId === exam.classId);
    for (const student of classStudents.slice(0, 3)) {
      const questions = await prisma.question.findMany({ where: { examId: exam.id } });
      const submission = await prisma.submission.create({
        data: {
          examId: exam.id,
          studentId: student.id,
          status: 'SUBMITTED',
          startedAt: new Date(2026, 3, 15),
          submittedAt: new Date(2026, 3, 15),
          totalScore: 60 + Math.floor(Math.random() * 35),
          percentage: 60 + Math.floor(Math.random() * 35),
        },
      });
      for (const q of questions) {
        await prisma.studentAnswer.create({
          data: {
            questionId: q.id,
            submissionId: submission.id,
            studentId: student.id,
            answer: ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)],
            score: Math.random() > 0.3 ? 20 : 0,
            gradingStatus: 'AUTO_GRADED',
          },
        });
      }
      examSubCount++;
    }
  }
  console.log(`📤 ${examSubCount} Exam Submissions created`);

  // Attendance (Mon-Fri for April 2026)
  let attendanceCount = 0;
  for (const student of students) {
    let dayOffset = 0;
    let recordsCreated = 0;
    while (recordsCreated < 20 && dayOffset < 30) {
      const date = new Date(2026, 3, 1 + dayOffset);
      const dayOfWeek = date.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const statuses = [AttendanceStatus.PRESENT, AttendanceStatus.PRESENT, AttendanceStatus.PRESENT, AttendanceStatus.SICK, AttendanceStatus.PERMISSION, AttendanceStatus.ABSENT];
        await prisma.attendance.create({
          data: {
            studentId: student.id,
            date: new Date(date.toDateString()),
            status: statuses[Math.floor(Math.random() * statuses.length)],
            note: Math.random() > 0.9 ? 'Izin sakit' : null,
          },
        });
        attendanceCount++;
        recordsCreated++;
      }
      dayOffset++;
    }
  }
  console.log(`📋 ${attendanceCount} Attendance records created`);

  // Grades
  let gradeCount = 0;
  for (const student of students) {
    for (const subject of subjects) {
      const subjectAssignments = assignments.filter(a => a.subjectId === subject.id);
      const subjectExams = exams.filter(e => e.subjectId === subject.id);
      for (const assignment of subjectAssignments.slice(0, 2)) {
        await prisma.grade.create({
          data: {
            studentId: student.id,
            subjectId: subject.id,
            assignmentId: assignment.id,
            value: 70 + Math.floor(Math.random() * 25),
            category: GradeCategory.ASSIGNMENT,
          },
        });
        gradeCount++;
      }
      for (const exam of subjectExams.slice(0, 1)) {
        await prisma.grade.create({
          data: {
            studentId: student.id,
            subjectId: subject.id,
            examId: exam.id,
            value: 70 + Math.floor(Math.random() * 25),
            category: GradeCategory.WEEKLY_EXAM,
          },
        });
        gradeCount++;
      }
      for (const cat of ['MIDTERM', 'FINAL'] as const) {
        await prisma.grade.create({
          data: { studentId: student.id, subjectId: subject.id, value: 70 + Math.floor(Math.random() * 25), category: cat },
        });
        gradeCount++;
      }
    }
  }
  console.log(`📊 ${gradeCount} Grades created`);

  // Invoices
  let invoiceCount = 0;
  for (const student of students) {
    await prisma.invoice.create({
      data: {
        studentId: student.id,
        title: 'SPP April 2026',
        amount: 500000,
        type: PaymentType.TUITION,
        description: 'Pembayaran SPP bulan April 2026',
        month: 4,
        year: 2026,
        dueDate: new Date('2026-04-10'),
        status: Math.random() > 0.3 ? PaymentStatus.PAID : PaymentStatus.UNPAID,
        paidAmount: Math.random() > 0.3 ? 500000 : 0,
      },
    });
    invoiceCount++;
    await prisma.invoice.create({
      data: {
        studentId: student.id,
        title: 'Biaya Buku Semester 2',
        amount: 250000,
        type: PaymentType.BOOKS,
        description: 'Pembayaran buku pelajaran semester 2',
        month: 4,
        year: 2026,
        dueDate: new Date('2026-04-15'),
        status: Math.random() > 0.5 ? PaymentStatus.PAID : PaymentStatus.UNPAID,
        paidAmount: Math.random() > 0.5 ? 250000 : 0,
      },
    });
    invoiceCount++;
  }
  console.log(`💰 ${invoiceCount} Invoices created`);

  // Payments
  let paymentCount = 0;
  const invoices = await prisma.invoice.findMany({ where: { status: PaymentStatus.PAID } });
  for (const invoice of invoices) {
    await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        studentId: invoice.studentId,
        amount: invoice.paidAmount || invoice.amount,
        method: ['CASH', 'TRANSFER', 'QR'][Math.floor(Math.random() * 3)],
        note: 'Pembayaran lunas',
      },
    });
    paymentCount++;
  }
  console.log(`💳 ${paymentCount} Payments created`);

  // Calendar Events
  const calendarEvents = [
    { title: 'Libur Idul Fitri 1447H', type: CalendarEventType.HOLIDAY, startDate: new Date('2026-03-20'), endDate: new Date('2026-04-05'), description: 'Libur nasional Hari Raya Idul Fitri 1447H', affectsAttendance: true },
    { title: 'Ujian Tengah Semester', type: CalendarEventType.EXAM_PERIOD, startDate: new Date('2026-04-07'), endDate: new Date('2026-04-14'), description: 'Pelaksanaan UTS untuk semua kelas', affectsAttendance: false },
    { title: 'Study Tour ke Museum', type: CalendarEventType.STUDY_TOUR, startDate: new Date('2026-05-15'), endDate: new Date('2026-05-15'), description: 'Kunjungan edukasi ke Museum Nasional', affectsAttendance: true },
    { title: 'Peringatan Maulid Nabi', type: CalendarEventType.CLASS_MEETING, startDate: new Date('2026-09-15'), endDate: new Date('2026-09-15'), description: 'Kegiatan peringatan Maulid Nabi Muhammad SAW', affectsAttendance: false },
    { title: 'Olimpiade Sains', type: CalendarEventType.COMPETITION, startDate: new Date('2026-10-10'), endDate: new Date('2026-10-12'), description: 'Olimpiade Sains tingkat sekolah', affectsAttendance: false },
  ];
  for (const event of calendarEvents) {
    await prisma.calendarEvent.create({ data: event });
  }
  console.log(`📅 ${calendarEvents.length} Calendar Events created`);

  // Bulletins
  const bulletins = [
    { title: 'Penerimaan Siswa Baru 2025/2026', content: 'Pendaftaran siswa baru telah dibuka. Segera daftarkan putra/putri Anda.', category: 'ANNOUNCEMENT' as const, status: 'ONGOING' as any },
    { title: 'Juara Olimpiade Matematika', content: 'Selamat kepada Ahmad Fauzi kelas 1A yang meraih juara 1 Olimpiade Matematika tingkat kota.', category: 'ACHIEVEMENT' as const, status: 'ONGOING' as any },
    { title: 'Peringatan Maulid Nabi', content: 'Kegiatan peringatan Maulid Nabi akan dilaksanakan pada hari Kamis besok.', category: 'EVENT' as const, status: 'ONGOING' as any },
  ];
  for (const b of bulletins) {
    const data: Prisma.BulletinUncheckedCreateInput = { ...b, authorId: adminUser.id } satisfies Prisma.BulletinUncheckedCreateInput;
    await prisma.bulletin.create({ data });
  }
  console.log(`📰 ${bulletins.length} Bulletins created`);

  // Inquiries
  const inquiries = [
    { parentName: 'Bapak Abdul Rahman', studentName: 'Aisyah Rahman', phone: '081234567890', email: 'abdul.rahman@gmail.com', gradeInterest: 'Grade 1', message: 'Saya ingin mendaftarkan anak saya untuk tahun ajaran baru.', status: 'NEW' },
    { parentName: 'Ibu Siti Khadijah', studentName: 'Muhammad Khairul', phone: '081298765432', email: 'siti.khadijah@gmail.com', gradeInterest: 'Grade 2', message: 'Apakah masih ada kuota untuk kelas 2?', status: 'CONTACTED' },
    { parentName: 'Bapak Hadi Wijaya', studentName: 'Nabila Wijaya', phone: '081345678901', gradeInterest: 'Grade 3', message: 'Berapa biaya pendaftaran dan SPP per bulan?', status: 'NEW' },
    { parentName: 'Ibu Rina Susanti', studentName: 'Farhan Susanti', phone: '081456789012', email: 'rina.susanti@gmail.com', gradeInterest: 'Grade 1', message: 'Kapan jadwal wawancara orang tua?', status: 'ENROLLED' },
    { parentName: 'Bapak Dedi Kurniawan', studentName: 'Salsabila Kurniawan', phone: '081567890123', gradeInterest: 'Grade 4', message: 'Apakah ada program beasiswa?', status: 'REJECTED' },
  ];
  for (const iq of inquiries) {
    await prisma.inquiry.create({ data: iq as any });
  }
  console.log(`📨 ${inquiries.length} Inquiries created\n`);

  // Summary
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║           SEED COMPLETE - DATA SUMMARY               ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log('║  👤 Admin               : 1                          ║');
  console.log('║  💰 Finance             : 1                          ║');
  console.log('║  👨‍🏫 Teachers           : 9                          ║');
  console.log('║  👨‍🎓 Students           : 30                         ║');
  console.log('║  📚 Class Levels        : 6                          ║');
  console.log('║  🏫 Classes             : 6                          ║');
  console.log('║  📖 Subjects            : 9                          ║');
  console.log('║  🔗 Enrollments         : 270                        ║');
  console.log('║  📅 Schedules           : ~60                        ║');
  console.log('║  📝 Assignments         : 36                         ║');
  console.log('║  📤 Assignment Subs     : ~90                        ║');
  console.log('║  📝 Exams               : 18                         ║');
  console.log('║  ❓ Questions           : 90                         ║');
  console.log('║  📤 Exam Submissions    : ~54                        ║');
  console.log('║  📋 Attendances         : 600                        ║');
  console.log('║  📊 Grades              : ~810                       ║');
  console.log('║  💰 Invoices            : 60                         ║');
  console.log('║  💳 Payments            : ~40                        ║');
  console.log('║  📅 Calendar Events     : 5                          ║');
  console.log('║  📰 Bulletins           : 3                          ║');
  console.log('║  📨 Inquiries           : 5                          ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('\n📋 Login Credentials (password: password123):');
  console.log('   Admin     : admin@nurulislam.sch.id');
  console.log('   Finance   : finance@nurulislam.sch.id');
  console.log('   Teachers  : [name]@nurulislam.sch.id');
  console.log('   Students  : siswa1@nurulislam.sch.id ... siswa30@nurulislam.sch.id');
  console.log('\n✨ Seed complete!');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

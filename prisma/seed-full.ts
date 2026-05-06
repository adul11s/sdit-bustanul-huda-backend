import { PrismaClient, Gender, Role, AttendanceStatus, PaymentStatus, PaymentType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PASSWORD_HASH = await bcrypt.hash('password123', 10);

// ============== DATA DEFINITIONS ==============

const ACADEMIC_YEAR = {
  name: '2025/2026',
  isCurrent: true,
  startDate: new Date('2025-07-01'),
  endDate: new Date('2026-06-30'),
};

const CLASS_LEVELS = [
  { name: 'Grade 1' },
  { name: 'Grade 2' },
  { name: 'Grade 3' },
  { name: 'Grade 4' },
  { name: 'Grade 5' },
  { name: 'Grade 6' },
];

const CLASS_NAMES = ['1A', '2A', '3A', '4A', '5A', '6A'];

// Indonesian curriculum subjects
const SUBJECT_DEFINITIONS = [
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

// Realistic Indonesian names
const STUDENT_NAMES = [
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

// Subject teachers — first 6 also serve as homeroom teachers
const TEACHERS = [
  { name: 'Pak Budi Santoso, M.Pd.', subject: 'Matematika', email: 'budi.santoso@nurulislam.sch.id', homeroomClass: '1A', title: 'S.Pd, M.Pd', teachingStyle: 'Menggunakan pendekatan konkret-piktorial-abstrak (CPA) untuk membantu siswa memahami konsep matematika secara visual dan praktis.', hobby: 'Catur, membaca buku sejarah matematika', avatar: '', birthDate: '1985-03-15', birthPlace: 'Surabaya' },
  { name: 'Ibu Siti Aminah, S.Pd.', subject: 'Bahasa Indonesia', email: 'siti.aminah@nurulislam.sch.id', homeroomClass: '2A', title: 'S.Pd', teachingStyle: 'Mendorong siswa untuk berani bercerita dan menulis kreatif melalui metode diskusi kelompok dan presentasi.', hobby: 'Menulis puisi, menenun', avatar: '', birthDate: '1988-07-22', birthPlace: 'Yogyakarta' },
  { name: 'Pak Ahmad Rizki, S.Pd.', subject: 'IPA', email: 'ahmad.rizki@nurulislam.sch.id', homeroomClass: '3A', title: 'S.Pd', teachingStyle: 'Belajar sains harus menyenangkan! Saya sering mengajak siswa melakukan eksperimen sederhana di kelas dan di luar ruangan.', hobby: 'Berkebun, fotografi alam', avatar: '', birthDate: '1990-11-05', birthPlace: 'Malang' },
  { name: 'Ibu Nur Hidayah, S.Pd.', subject: 'IPS', email: 'nur.hidayah@nurulislam.sch.id', homeroomClass: '4A', title: 'S.Pd', teachingStyle: 'Menggunakan studi kasus lokal dan peran-peran untuk membuat pelajaran IPS hidup dan relevan dengan kehidupan sehari-hari siswa.', hobby: 'Traveling, mengoleksi prangko', avatar: '', birthDate: '1987-01-12', birthPlace: 'Solo' },
  { name: 'Pak Hendar Wijaya, M.Pd.', subject: 'PPKn', email: 'hendar.wijaya@nurulislam.sch.id', homeroomClass: '5A', title: 'S.Pd, M.Pd', teachingStyle: 'Membentuk karakter bangsa melalui diskusi nilai-nilai luhur, simulasi demokrasi, dan kegiatan sosial di masyarakat.', hobby: 'Mendaki gunung, membaca biografi', avatar: '', birthDate: '1983-09-30', birthPlace: 'Bandung' },
  { name: 'Ibu Maria Lestari, S.Pd.', subject: 'Bahasa Inggris', email: 'maria.lestari@nurulislam.sch.id', homeroomClass: '6A', title: 'S.Pd', teachingStyle: 'English should be fun! Saya menggunakan lagu, permainan peran, dan cerita untuk membangun kepercayaan diri berbahasa Inggris.', hobby: 'Menonton film, baking', avatar: '', birthDate: '1992-05-18', birthPlace: 'Jakarta' },
  { name: 'Ibu Dewi Permata, S.Sn.', subject: 'Seni Budaya', email: 'dewi.permata@nurulislam.sch.id', title: 'S.Sn', teachingStyle: 'Setiap anak adalah seniman. Saya memberikan ruang ekspresi bebas melalui musik, tari, dan kerajinan tangan tradisional.', hobby: 'Melukis, bermain gamelan', avatar: '', birthDate: '1989-08-08', birthPlace: 'Bali' },
  { name: 'Pak Joko Susilo, S.Or.', subject: 'PJOK', email: 'joko.susilo@nurulislam.sch.id', title: 'S.Or', teachingStyle: 'Kesehatan dan kebugaran adalah investasi masa depan. Saya menggabungkan olahraga tradisional dan modern untuk kebugaran holistik.', hobby: 'Maraton, memancing', avatar: '', birthDate: '1986-04-20', birthPlace: 'Semarang' },
  { name: 'Ustadz Lukman Hakim', subject: 'Pendidikan Agama Islam', email: 'lukman.hakim@nurulislam.sch.id', title: 'S.Ag', teachingStyle: 'Membumikan nilai-nilai Islam dalam kehidupan sehari-hari melalui cerita, hafalan, dan praktik ibadah yang penuh kasih sayang.', hobby: 'Khat, berkebun sayur', avatar: '', birthDate: '1984-12-01', birthPlace: 'Lampung' },
];

// Schedule time slots respecting break times
// Break 1: 07:00-07:30, Break 2: 12:00-13:00
// Friday: no classes after 11:30
const TIME_SLOTS = [
  { start: '07:30', end: '09:30' },
  { start: '09:30', end: '11:30' },
  { start: '13:00', end: '15:00' }, // Mon-Thu only
];

const FRIDAY_SLOTS = [
  { start: '07:30', end: '09:30' },
  { start: '09:30', end: '11:30' },
];

async function main() {
  console.log('🌱 Starting comprehensive data seed...\n');

  // ============== 1. CLEANUP ==============
  console.log('🧹 Cleaning existing data...');
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.studentAnswer.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.question.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.promotionHistory.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.bulletin.deleteMany();
  await prisma.inquiry.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.student.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.class.deleteMany();
  await prisma.classLevel.deleteMany();
  await prisma.academicYear.deleteMany();
  await prisma.user.deleteMany();
  console.log('✅ Cleanup complete\n');

  // ============== 2. ACADEMIC YEAR ==============
  console.log('📅 Creating academic year...');
  const academicYear = await prisma.academicYear.create({ data: ACADEMIC_YEAR });
  console.log(`✅ Academic Year: ${academicYear.name}\n`);

  // ============== 3. CLASS LEVELS ==============
  console.log('📚 Creating class levels...');
  const classLevels = [];
  for (const level of CLASS_LEVELS) {
    const created = await prisma.classLevel.create({ data: level });
    classLevels.push(created);
    console.log(`   ${created.name}`);
  }
  console.log('✅ Class levels created\n');

  // ============== 4. ADMIN USER ==============
  console.log('👤 Creating admin user...');
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@nurulislam.sch.id',
      password: PASSWORD_HASH,
      name: 'Administrator',
      role: Role.ADMIN,
      gender: Gender.MALE,
      isActive: true,
    },
  });
  console.log('✅ Admin created\n');

  // ============== 5. TEACHERS (Subject + Homeroom combined) ==============
  console.log('👨‍🏫 Creating teachers (subject + homeroom combined)...');
  const teachers = [];
  for (const t of TEACHERS) {
    const role = t.homeroomClass ? Role.HOMEROOM_TEACHER : Role.TEACHER;
    const user = await prisma.user.create({
      data: {
        email: t.email,
        password: PASSWORD_HASH,
        name: t.name,
        role,
        gender: t.name.startsWith('Ibu') || t.name.startsWith('Bu') ? Gender.FEMALE : Gender.MALE,
        isActive: true,
        title: t.title || null,
        teachingStyle: t.teachingStyle || null,
        hobby: t.hobby || null,
        avatar: t.avatar || null,
        birthDate: t.birthDate ? new Date(t.birthDate) : null,
        birthPlace: t.birthPlace || null,
      },
    });
    const teacher = await prisma.teacher.create({
      data: { userId: user.id },
    });
    teachers.push({ ...teacher, user, subject: t.subject, homeroomClass: t.homeroomClass });
    console.log(`   ${t.name} (${t.subject})${t.homeroomClass ? ` → Wali Kelas ${t.homeroomClass}` : ''}`);
  }
  console.log('✅ Teachers created\n');

  // ============== 6. CLASSES ==============
  console.log('🏫 Creating classes...');
  const classes = [];
  for (let i = 0; i < 6; i++) {
    const homeroomTeacher = teachers.find((t) => t.homeroomClass === CLASS_NAMES[i]);
    const cls = await prisma.class.create({
      data: {
        name: CLASS_NAMES[i],
        levelId: classLevels[i].id,
        homeroomTeacherId: homeroomTeacher?.id || null,
      },
    });
    classes.push(cls);
    console.log(`   ${cls.name} (Wali Kelas: ${homeroomTeacher?.user.name || 'Belum ditugaskan'})`);
  }
  console.log('✅ Classes created\n');

  // ============== 7. SUBJECTS ==============
  console.log('📖 Creating subjects...');
  const subjects = [];
  for (let i = 0; i < SUBJECT_DEFINITIONS.length; i++) {
    const teacher = teachers.find((t) => t.subject === SUBJECT_DEFINITIONS[i].name);
    const subject = await prisma.subject.create({
      data: {
        name: SUBJECT_DEFINITIONS[i].name,
        code: SUBJECT_DEFINITIONS[i].code,
        teacherId: teacher?.id || teachers[0].id,
      },
    });
    subjects.push(subject);
    console.log(`   ${subject.name} (${subject.code}) - ${teacher?.user.name || teachers[0].user.name}`);
  }
  console.log('✅ Subjects created\n');

  // ============== 8. STUDENTS ==============
  console.log('👨‍🎓 Creating students...');
  const students = [];
  for (let i = 0; i < STUDENT_NAMES.length; i++) {
    const studentData = STUDENT_NAMES[i];
    const classIndex = Math.floor(i / 5);
    const user = await prisma.user.create({
      data: {
        email: `siswa${i + 1}@nurulislam.sch.id`,
        password: PASSWORD_HASH,
        name: studentData.name,
        role: Role.STUDENT,
        gender: studentData.gender,
        isActive: true,
      },
    });
    const student = await prisma.student.create({
      data: {
        userId: user.id,
        classId: classes[classIndex].id,
      },
    });
    students.push({ ...student, user, class: classes[classIndex] });
  }
  for (const cls of classes) {
    const clsStudents = students.filter((s) => s.classId === cls.id);
    console.log(`   ${cls.name}: ${clsStudents.map((s) => s.user.name).join(', ')}`);
  }
  console.log('✅ Students created\n');

  // ============== 9. ENROLLMENTS ==============
  console.log('🔗 Creating enrollments (student-subject)...');
  let enrollmentCount = 0;
  for (const student of students) {
    for (const subject of subjects) {
      await prisma.enrollment.create({
        data: {
          studentId: student.id,
          subjectId: subject.id,
          isActive: true,
        },
      });
      enrollmentCount++;
    }
  }
  console.log(`✅ ${enrollmentCount} enrollments created\n`);

  // ============== 10. SCHEDULES (conflict-free) ==============
  console.log('📅 Creating conflict-free class schedules...');
  const days = [1, 2, 3, 4, 5]; // Monday-Friday
  let scheduleCount = 0;
  let conflictSkips = 0;

  // Track busy teachers per (day, slot)
  const busyTeachers = new Map<string, Set<string>>();

  function isTeacherBusy(day: number, slotIndex: number, teacherId: string): boolean {
    const key = `${day}-${slotIndex}`;
    return busyTeachers.get(key)?.has(teacherId) ?? false;
  }

  function markTeacherBusy(day: number, slotIndex: number, teacherId: string) {
    const key = `${day}-${slotIndex}`;
    if (!busyTeachers.has(key)) busyTeachers.set(key, new Set());
    busyTeachers.get(key)!.add(teacherId);
  }

  // Build schedule: each class gets 2 subjects per day
  // Rotate subjects so each class sees ~all 9 subjects across the week
  for (const cls of classes) {
    let subjectIdx = 0;
    for (const day of days) {
      const slots = day === 5 ? FRIDAY_SLOTS : TIME_SLOTS;
      for (let slotIdx = 0; slotIdx < slots.length; slotIdx++) {
        if (subjectIdx >= subjects.length) subjectIdx = 0;

        const subject = subjects[subjectIdx];
        const teacher = teachers.find((t) => t.subject === subject.name);
        if (!teacher) { subjectIdx++; continue; }

        // Check for teacher conflict
        if (isTeacherBusy(day, slotIdx, teacher.id)) {
          conflictSkips++;
          // Try next subject to find one without conflict
          let found = false;
          for (let attempt = 1; attempt < subjects.length; attempt++) {
            const altIdx = (subjectIdx + attempt) % subjects.length;
            const altSubject = subjects[altIdx];
            const altTeacher = teachers.find((t) => t.subject === altSubject.name);
            if (altTeacher && !isTeacherBusy(day, slotIdx, altTeacher.id)) {
              await prisma.schedule.create({
                data: {
                  subjectId: altSubject.id,
                  classId: cls.id,
                  academicYearId: academicYear.id,
                  dayOfWeek: day,
                  startTime: slots[slotIdx].start,
                  endTime: slots[slotIdx].end,
                  room: `Ruang ${cls.name}`,
                },
              });
              markTeacherBusy(day, slotIdx, altTeacher.id);
              scheduleCount++;
              found = true;
              break;
            }
          }
          if (!found) {
            console.log(`   ⚠️ Could not find conflict-free slot for ${cls.name} on day ${day} slot ${slotIdx}`);
          }
        } else {
          await prisma.schedule.create({
            data: {
              subjectId: subject.id,
              classId: cls.id,
              academicYearId: academicYear.id,
              dayOfWeek: day,
              startTime: slots[slotIdx].start,
              endTime: slots[slotIdx].end,
              room: `Ruang ${cls.name}`,
            },
          });
          markTeacherBusy(day, slotIdx, teacher.id);
          scheduleCount++;
        }
        subjectIdx++;
      }
    }
  }
  console.log(`✅ ${scheduleCount} schedules created (${conflictSkips} conflicts resolved by rotation)\n`);

  // ============== 11. ASSIGNMENTS ==============
  console.log('📝 Creating assignments...');
  let assignmentCount = 0;
  const assignments: Array<{ id: string; subjectId: string }> = [];
  for (const subject of subjects) {
    for (let i = 1; i <= 3; i++) {
      const assignment = await prisma.assignment.create({
        data: {
          title: `Tugas ${subject.name} #${i}`,
          content: `Kerjakan soal-soal latihan ${subject.name} pada halaman ${i * 10}-${i * 10 + 5}.`,
          dueDate: new Date(`2025-0${i + 7}-15`),
          points: 100,
          subjectId: subject.id,
          targetType: 'CLASS',
          classId: classes[0].id,
          category: 'ASSIGNMENT',
        },
      });
      assignments.push({ id: assignment.id, subjectId: subject.id });
      assignmentCount++;
    }
  }

  const studentTargetAssignments: Array<{ id: string }> = [];
  for (const subject of subjects) {
    const assignment = await prisma.assignment.create({
      data: {
        title: `Tugas Khusus ${subject.name}`,
        content: `Tugas remedial untuk siswa tertentu dalam mata pelajaran ${subject.name}.`,
        dueDate: new Date('2025-08-20'),
        points: 100,
        subjectId: subject.id,
        targetType: 'STUDENT',
        category: 'ASSIGNMENT',
      },
    });
    studentTargetAssignments.push({ id: assignment.id });
    assignmentCount++;
  }

  let astCount = 0;
  for (let i = 0; i < studentTargetAssignments.length; i++) {
    const targetStudents = students.slice(i * 3, i * 3 + 3);
    for (const student of targetStudents) {
      await prisma.assignmentStudentTarget.create({
        data: { assignmentId: studentTargetAssignments[i].id, studentId: student.id },
      });
      astCount++;
    }
  }
  console.log(`✅ ${assignmentCount} assignments created (${astCount} student targets)\n`);

  // ============== 12. EXAMS ==============
  console.log('📝 Creating exams...');
  const exams: Array<{ id: string; subjectId: string }> = [];
  const studentTargetExams: Array<{ id: string }> = [];

  for (const subject of subjects) {
    const teacher = teachers.find((t) => t.subject === subject.name);
    const exam = await prisma.exam.create({
      data: {
        title: `Ujian Tengah Semester - ${subject.name}`,
        description: `Ujian tengah semester untuk mata pelajaran ${subject.name}`,
        type: 'MCQ',
        subjectId: subject.id,
        timeLimit: 60,
        totalScore: 100,
        isPublished: true,
        isActive: true,
        allowRetry: false,
        maxAttempts: 1,
        createdById: teacher?.id || teachers[0].id,
        targetType: 'CLASS',
        classId: classes[0].id,
        category: 'WEEKLY_EXAM',
      },
    });
    exams.push(exam);

    const targetedExam = await prisma.exam.create({
      data: {
        title: `Ujian Remedial - ${subject.name}`,
        description: `Ujian remedial untuk siswa tertentu dalam mata pelajaran ${subject.name}`,
        type: 'MCQ',
        subjectId: subject.id,
        timeLimit: 45,
        totalScore: 100,
        isPublished: true,
        isActive: true,
        allowRetry: false,
        maxAttempts: 1,
        createdById: teacher?.id || teachers[0].id,
        targetType: 'STUDENT',
        category: 'WEEKLY_EXAM',
      },
    });
    studentTargetExams.push(targetedExam);

    for (const examObj of [exam, targetedExam]) {
      for (let i = 1; i <= 5; i++) {
        await prisma.question.create({
          data: {
            examId: examObj.id,
            text: `Soal ${i}: Berikut ini adalah pertanyaan tentang ${subject.name}.`,
            type: 'MCQ',
            options: ['Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D'],
            correctAnswer: 'A',
            score: 20,
            order: i,
            isActive: true,
          },
        });
      }
    }
  }

  let estCount = 0;
  for (let i = 0; i < studentTargetExams.length; i++) {
    const targetStudents = students.slice(i * 2, i * 2 + 2);
    for (const student of targetStudents) {
      await prisma.examStudentTarget.create({
        data: { examId: studentTargetExams[i].id, studentId: student.id },
      });
      estCount++;
    }
  }
  console.log(`✅ ${exams.length + studentTargetExams.length} exams created (${estCount} student targets)\n`);

  // ============== 13. ATTENDANCES (weekdays only, no weekends) ==============
  console.log('📋 Creating attendances (Mon-Fri only)...');
  let attendanceCount = 0;
  const today = new Date();

  for (const student of students) {
    let dayOffset = 0;
    let recordsCreated = 0;
    while (recordsCreated < 5) {
      const date = new Date(today);
      date.setDate(date.getDate() - dayOffset);
      const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

      // Skip weekends (Saturday=6, Sunday=0)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        await prisma.attendance.create({
          data: {
            studentId: student.id,
            date: new Date(date.toDateString()),
            status: recordsCreated === 0 ? AttendanceStatus.PRESENT : Math.random() > 0.9 ? AttendanceStatus.SICK : AttendanceStatus.PRESENT,
            note: recordsCreated === 0 && Math.random() > 0.9 ? 'Izin sakit' : null,
          },
        });
        attendanceCount++;
        recordsCreated++;
      }
      dayOffset++;
    }
  }
  console.log(`✅ ${attendanceCount} attendance records created (weekdays only)\n`);

  // ============== 14. GRADES (linked to assignments and exams) ==============
  console.log('📊 Creating grades with task links...');
  let gradeCount = 0;

  for (const student of students) {
    for (const subject of subjects) {
      // Find assignments for this subject
      const subjectAssignments = assignments.filter((a) => a.subjectId === subject.id);
      // Find exams for this subject
      const subjectExams = exams.filter((e) => e.subjectId === subject.id);

      // Create assignment grades
      for (const assignment of subjectAssignments.slice(0, 2)) {
        await prisma.grade.create({
          data: {
            studentId: student.id,
            subjectId: subject.id,
            assignmentId: assignment.id,
            value: 70 + Math.floor(Math.random() * 25),
            comment: Math.random() > 0.7 ? 'Pertahankan prestasimu!' : null,
            category: 'ASSIGNMENT',
          },
        });
        gradeCount++;
      }

      // Create exam grades
      for (const exam of subjectExams.slice(0, 1)) {
        await prisma.grade.create({
          data: {
            studentId: student.id,
            subjectId: subject.id,
            examId: exam.id,
            value: 70 + Math.floor(Math.random() * 25),
            comment: Math.random() > 0.7 ? 'Bagus!' : null,
            category: 'WEEKLY_EXAM',
          },
        });
        gradeCount++;
      }

      // Create some general category grades
      for (let g = 0; g < 2; g++) {
        const categories: Array<'MIDTERM' | 'FINAL'> = ['MIDTERM', 'FINAL'];
        await prisma.grade.create({
          data: {
            studentId: student.id,
            subjectId: subject.id,
            value: 70 + Math.floor(Math.random() * 25),
            comment: Math.random() > 0.7 ? 'Terus belajar!' : null,
            category: categories[g],
          },
        });
        gradeCount++;
      }
    }
  }
  console.log(`✅ ${gradeCount} grades created (linked to assignments, exams, and categories)\n`);

  // ============== 15. INVOICES ==============
  console.log('💰 Creating invoices...');
  let invoiceCount = 0;
  for (const student of students) {
    await prisma.invoice.create({
      data: {
        studentId: student.id,
        title: 'SPP Bulan Juli 2025',
        amount: 500000,
        type: PaymentType.TUITION,
        description: 'Pembayaran SPP bulan Juli 2025',
        month: 7,
        year: 2025,
        dueDate: new Date('2025-07-10'),
        status: Math.random() > 0.3 ? PaymentStatus.PAID : PaymentStatus.UNPAID,
        paidAmount: Math.random() > 0.3 ? 500000 : 0,
      },
    });
    invoiceCount++;

    await prisma.invoice.create({
      data: {
        studentId: student.id,
        title: 'Biaya Buku Semester 1',
        amount: 250000,
        type: PaymentType.BOOKS,
        description: 'Pembayaran buku pelajaran semester 1',
        month: 7,
        year: 2025,
        dueDate: new Date('2025-07-15'),
        status: Math.random() > 0.5 ? PaymentStatus.PAID : PaymentStatus.UNPAID,
        paidAmount: Math.random() > 0.5 ? 250000 : 0,
      },
    });
    invoiceCount++;
  }
  console.log(`✅ ${invoiceCount} invoices created\n`);

  // ============== 16. BULLETINS ==============
  console.log('📰 Creating bulletins...');
  const bulletins = [
    {
      title: 'Penerimaan Siswa Baru Tahun Ajaran 2025/2026',
      content: 'Pendaftaran siswa baru telah dibuka. Segera daftarkan putra/putri Anda untuk tahun ajaran baru.',
      category: 'ANNOUNCEMENT',
      status: 'ONGOING',
    },
    {
      title: 'Peringatan Maulid Nabi Muhammad SAW',
      content: 'Kegiatan peringatan Maulid Nabi akan dilaksanakan pada hari Kamis besok. Seluruh siswa diwajibkan hadir.',
      category: 'EVENT',
      status: 'ONGOING',
    },
    {
      title: 'Juara Olimpiade Matematika Tingkat Kota',
      content: 'Selamat kepada Ahmad Fauzi kelas 1A yang meraih juara 1 Olimpiade Matematika tingkat kota.',
      category: 'ACHIEVEMENT',
      status: 'ONGOING',
    },
  ];
  for (const b of bulletins) {
    await prisma.bulletin.create({
      data: { ...b, authorId: adminUser.id } as any,
    });
  }
  console.log(`✅ ${bulletins.length} bulletins created\n`);

  // ============== 17. INQUIRIES ==============
  console.log('📨 Creating inquiries...');
  const inquiryData = [
    { parentName: 'Bapak Abdul Rahman', studentName: 'Aisyah Rahman', phone: '081234567890', email: 'abdul.rahman@gmail.com', gradeInterest: 'Grade 1', message: 'Saya ingin mendaftarkan anak saya untuk tahun ajaran baru.', status: 'NEW' },
    { parentName: 'Ibu Siti Khadijah', studentName: 'Muhammad Khairul', phone: '081298765432', email: 'siti.khadijah@gmail.com', gradeInterest: 'Grade 2', message: 'Apakah masih ada kuota untuk kelas 2?', status: 'CONTACTED' },
    { parentName: 'Bapak Hadi Wijaya', studentName: 'Nabila Wijaya', phone: '081345678901', gradeInterest: 'Grade 3', message: 'Berapa biaya pendaftaran dan SPP per bulan?', status: 'NEW' },
    { parentName: 'Ibu Rina Susanti', studentName: 'Farhan Susanti', phone: '081456789012', email: 'rina.susanti@gmail.com', gradeInterest: 'Grade 1', message: 'Kapan jadwal wawancara orang tua?', status: 'ENROLLED' },
    { parentName: 'Bapak Dedi Kurniawan', studentName: 'Salsabila Kurniawan', phone: '081567890123', gradeInterest: 'Grade 4', message: 'Apakah ada program beasiswa?', status: 'REJECTED' },
    { parentName: 'Ibu Yuni Astuti', studentName: 'Rafael Astuti', phone: '081678901234', gradeInterest: 'Grade 5', message: 'Bagaimana kurikulum yang digunakan?', status: 'NEW' },
    { parentName: 'Bapak Ahmad Subagyo', studentName: 'Zahra Subagyo', phone: '081789012345', email: 'ahmad.subagyo@gmail.com', gradeInterest: 'Grade 6', message: 'Apakah ada kelas persiapan UN?', status: 'CONTACTED' },
  ];
  let inquiryCount = 0;
  for (const iq of inquiryData) {
    await prisma.inquiry.create({ data: { ...iq } as any });
    inquiryCount++;
  }
  console.log(`✅ ${inquiryCount} inquiries created\n`);

  // ============== SUMMARY ==============
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║           SEED COMPLETE - DATA SUMMARY               ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log('║  👤 Admin Users          : 1                         ║');
  console.log('║  👨‍🏫 Teachers (combined)  : 9                         ║');
  console.log('║     → 6 Subject + Homeroom Teachers                  ║');
  console.log('║     → 3 Subject-only Teachers                        ║');
  console.log('║  👨‍🎓 Students            : 30                        ║');
  console.log('║  📚 Class Levels         : 6                         ║');
  console.log('║  🏫 Classes              : 6                         ║');
  console.log('║  📖 Subjects             : 9                         ║');
  console.log('║  🔗 Enrollments          : 270                       ║');
  console.log('║  📅 Schedules            : ~60 (conflict-free)       ║');
  console.log('║  📝 Assignments          : 36                        ║');
  console.log('║  📝 Exams                : 18                        ║');
  console.log('║  ❓ Questions            : 90                        ║');
  console.log('║  📋 Attendances          : 150 (Mon-Fri only)        ║');
  console.log('║  📊 Grades               : ~810 (task-linked)        ║');
  console.log('║  💰 Invoices             : 60                        ║');
  console.log('║  📰 Bulletins            : 3                         ║');
  console.log('║  📨 Inquiries            : 7                         ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('\n📋 Constraints Enforced:');
  console.log('   • No teacher double-booked (schedule conflict check)');
  console.log('   • No weekend attendance (Mon-Fri only)');
  console.log('   • Teachers can double as homeroom (6 dual-role teachers)');
  console.log('   • Break times respected (07:00-07:30, 12:00-13:00)');
  console.log('   • Friday restriction: classes end by 11:30');
  console.log('\n📋 Test Credentials:');
  console.log('   Admin    : admin@nurulislam.sch.id / password123');
  console.log('   Teachers : [teacher-email]@nurulislam.sch.id / password123');
  console.log('   Students : siswa1@nurulislam.sch.id ... siswa30@nurulislam.sch.id / password123');
  console.log('\n✨ All data seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

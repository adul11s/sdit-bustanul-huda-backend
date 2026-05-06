import prisma from '../utils/prisma.js';

export interface BreakTimeRule {
  name: string;
  startTime: string;
  endTime: string;
  days?: number[]; // 1-7, if undefined applies to all days
}

// Break time rules (hardcoded per requirements)
export const BREAK_RULES: BreakTimeRule[] = [
  { name: 'Morning Break', startTime: '09:00', endTime: '09:30', days: [1, 2, 3, 4, 5] },
  { name: 'Lunch Break', startTime: '12:00', endTime: '13:00', days: [1, 2, 3, 4, 5] },
];

// Friday special restriction
export const FRIDAY_RESTRICTION = {
  startTime: '11:00',
  endTime: '13:00',
  day: 5, // Friday
};

export interface ScheduleValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ScheduleValidationError[];
}

export interface ScheduleInput {
  subjectId: string;
  classId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  academicYearId: string;
  room?: string;
}

export class ScheduleValidationService {
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private overlaps(start1: number, end1: number, start2: number, end2: number): boolean {
    return start1 < end2 && end1 > start2;
  }

  /**
   * Check if a time range falls within break time
   */
  private isInBreakTime(dayOfWeek: number, startTime: string, endTime: string): ScheduleValidationError[] {
    const errors: ScheduleValidationError[] = [];
    const newStart = this.timeToMinutes(startTime);
    const newEnd = this.timeToMinutes(endTime);

    // Check regular break times
    for (const breakRule of BREAK_RULES) {
      if (breakRule.days && !breakRule.days.includes(dayOfWeek)) continue;

      const breakStart = this.timeToMinutes(breakRule.startTime);
      const breakEnd = this.timeToMinutes(breakRule.endTime);

      if (this.overlaps(newStart, newEnd, breakStart, breakEnd)) {
        errors.push({
          field: 'time',
          message: `Schedule overlaps with ${breakRule.name} (${breakRule.startTime} - ${breakRule.endTime})`,
        });
      }
    }

    // Check Friday restriction
    if (dayOfWeek === FRIDAY_RESTRICTION.day) {
      const restrictStart = this.timeToMinutes(FRIDAY_RESTRICTION.startTime);
      const restrictEnd = this.timeToMinutes(FRIDAY_RESTRICTION.endTime);

      if (this.overlaps(newStart, newEnd, restrictStart, restrictEnd)) {
        errors.push({
          field: 'time',
          message: `Friday scheduling is restricted from ${FRIDAY_RESTRICTION.startTime} to ${FRIDAY_RESTRICTION.endTime}`,
        });
      }
    }

    return errors;
  }

  /**
   * Check if teacher is already scheduled at this time
   */
  private async checkTeacherConflict(
    teacherId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    excludeScheduleId?: string
  ): Promise<ScheduleValidationError[]> {
    const errors: ScheduleValidationError[] = [];
    const newStart = this.timeToMinutes(startTime);
    const newEnd = this.timeToMinutes(endTime);

    const existingSchedules = await prisma.schedule.findMany({
      where: {
        subject: { teacherId },
        dayOfWeek,
        id: excludeScheduleId ? { not: excludeScheduleId } : undefined,
      },
      include: { class: true, subject: true },
    });

    for (const existing of existingSchedules) {
      const existStart = this.timeToMinutes(existing.startTime);
      const existEnd = this.timeToMinutes(existing.endTime);

      if (this.overlaps(newStart, newEnd, existStart, existEnd)) {
        errors.push({
          field: 'teacher',
          message: `Teacher conflict: Already assigned to class ${existing.class.name} ` +
            `(${existing.startTime} - ${existing.endTime}) on this day`,
        });
      }
    }

    return errors;
  }

  /**
   * Check if class is already scheduled at this time
   */
  private async checkClassConflict(
    classId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    excludeScheduleId?: string
  ): Promise<ScheduleValidationError[]> {
    const errors: ScheduleValidationError[] = [];
    const newStart = this.timeToMinutes(startTime);
    const newEnd = this.timeToMinutes(endTime);

    const existingSchedules = await prisma.schedule.findMany({
      where: {
        classId,
        dayOfWeek,
        id: excludeScheduleId ? { not: excludeScheduleId } : undefined,
      },
      include: { subject: true, class: true },
    });

    for (const existing of existingSchedules) {
      const existStart = this.timeToMinutes(existing.startTime);
      const existEnd = this.timeToMinutes(existing.endTime);

      if (this.overlaps(newStart, newEnd, existStart, existEnd)) {
        errors.push({
          field: 'class',
          message: `Class conflict: ${existing.class.name} already has ${existing.subject.name} ` +
            `(${existing.startTime} - ${existing.endTime}) on this day`,
        });
      }
    }

    return errors;
  }

  /**
   * Validate a new schedule against all rules
   */
  async validateSchedule(
    data: ScheduleInput,
    excludeScheduleId?: string
  ): Promise<ValidationResult> {
    const errors: ScheduleValidationError[] = [];

    // 1. Get teacher from subject
    const subject = await prisma.subject.findUnique({
      where: { id: data.subjectId },
      select: { teacherId: true },
    });

    if (!subject) {
      errors.push({ field: 'subjectId', message: 'Subject not found' });
      return { valid: false, errors };
    }

    // 2. Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(data.startTime) || !timeRegex.test(data.endTime)) {
      errors.push({ field: 'time', message: 'Invalid time format. Use HH:mm' });
      return { valid: false, errors };
    }

    const startMinutes = this.timeToMinutes(data.startTime);
    const endMinutes = this.timeToMinutes(data.endTime);

    if (startMinutes >= endMinutes) {
      errors.push({ field: 'time', message: 'End time must be after start time' });
    }

    // 3. Check break times
    const breakErrors = this.isInBreakTime(data.dayOfWeek, data.startTime, data.endTime);
    errors.push(...breakErrors);

    // 4. Check teacher conflict
    const teacherErrors = await this.checkTeacherConflict(
      subject.teacherId,
      data.dayOfWeek,
      data.startTime,
      data.endTime,
      excludeScheduleId
    );
    errors.push(...teacherErrors);

    // 5. Check class conflict
    const classErrors = await this.checkClassConflict(
      data.classId,
      data.dayOfWeek,
      data.startTime,
      data.endTime,
      excludeScheduleId
    );
    errors.push(...classErrors);

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get available time slots for a teacher on a specific day
   */
  async getTeacherAvailability(teacherId: string, dayOfWeek: number): Promise<string[]> {
    const existingSchedules = await prisma.schedule.findMany({
      where: {
        subject: { teacherId },
        dayOfWeek,
      },
      orderBy: { startTime: 'asc' },
    });

    // School hours: 07:00 - 16:00
    const schoolStart = this.timeToMinutes('07:00');
    const schoolEnd = this.timeToMinutes('16:00');

    const slots: string[] = [];
    let currentStart = schoolStart;

    for (const schedule of existingSchedules) {
      const scheduleStart = this.timeToMinutes(schedule.startTime);
      const scheduleEnd = this.timeToMinutes(schedule.endTime);

      if (currentStart < scheduleStart) {
        slots.push(`${this.minutesToTime(currentStart)} - ${this.minutesToTime(scheduleStart)}`);
      }
      currentStart = Math.max(currentStart, scheduleEnd);
    }

    if (currentStart < schoolEnd) {
      slots.push(`${this.minutesToTime(currentStart)} - ${this.minutesToTime(schoolEnd)}`);
    }

    return slots;
  }

  /**
   * Get available time slots for a class on a specific day
   */
  async getClassAvailability(classId: string, dayOfWeek: number): Promise<string[]> {
    const existingSchedules = await prisma.schedule.findMany({
      where: {
        classId,
        dayOfWeek,
      },
      orderBy: { startTime: 'asc' },
    });

    const schoolStart = this.timeToMinutes('07:00');
    const schoolEnd = this.timeToMinutes('16:00');

    const slots: string[] = [];
    let currentStart = schoolStart;

    for (const schedule of existingSchedules) {
      const scheduleStart = this.timeToMinutes(schedule.startTime);
      const scheduleEnd = this.timeToMinutes(schedule.endTime);

      if (currentStart < scheduleStart) {
        slots.push(`${this.minutesToTime(currentStart)} - ${this.minutesToTime(scheduleStart)}`);
      }
      currentStart = Math.max(currentStart, scheduleEnd);
    }

    if (currentStart < schoolEnd) {
      slots.push(`${this.minutesToTime(currentStart)} - ${this.minutesToTime(schoolEnd)}`);
    }

    return slots;
  }

  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }
}

export const scheduleValidationService = new ScheduleValidationService();
export default scheduleValidationService;

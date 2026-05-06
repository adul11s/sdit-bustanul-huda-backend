import prisma from '../utils/prisma.js';
import { calendarService } from './calendar.service.js';

export interface WorkloadPeriod {
  startDate: Date;
  endDate: Date;
}

export interface WeeklyWorkload {
  weekStart: Date;
  weekEnd: Date;
  totalHours: number;
  scheduleCount: number;
  dailyBreakdown: Record<number, number>; // dayOfWeek -> hours
}

export interface MonthlyWorkload {
  year: number;
  month: number;
  totalHours: number;
  scheduleCount: number;
  weeklyBreakdown: WeeklyWorkload[];
}

export interface TeacherWorkloadSummary {
  teacherId: string;
  teacherName: string;
  weekly: WeeklyWorkload[];
  monthly: MonthlyWorkload[];
  averageWeeklyHours: number;
}

export class WorkloadCalculationService {
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private calculateDuration(startTime: string, endTime: string): number {
    return (this.timeToMinutes(endTime) - this.timeToMinutes(startTime)) / 60;
  }

  /**
   * Calculate weekly workload for a teacher
   */
  async calculateWeeklyWorkload(
    teacherId: string,
    startDate: Date,
    endDate: Date
  ): Promise<WeeklyWorkload[]> {
    const schedules = await prisma.schedule.findMany({
      where: {
        subject: { teacherId },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    // Get excluded dates from calendar events
    const excludedDates = await calendarService.getAffectedDates(startDate, endDate, 'affectsWorkload');
    const excludedDateStrings = new Set(excludedDates.map(d => d.toDateString()));

    // Group by week
    const weekMap = new Map<string, WeeklyWorkload>();

    for (const schedule of schedules) {
      // Determine which week this schedule falls into
      const scheduleDate = this.getDateForDayOfWeek(schedule.dayOfWeek, startDate);

      // Skip if this date is excluded by calendar
      if (excludedDateStrings.has(scheduleDate.toDateString())) {
        continue;
      }

      const weekStart = this.getWeekStart(scheduleDate);
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, {
          weekStart,
          weekEnd: new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000),
          totalHours: 0,
          scheduleCount: 0,
          dailyBreakdown: {},
        });
      }

      const week = weekMap.get(weekKey)!;
      const duration = this.calculateDuration(schedule.startTime, schedule.endTime);
      week.totalHours += duration;
      week.scheduleCount += 1;
      week.dailyBreakdown[schedule.dayOfWeek] = (week.dailyBreakdown[schedule.dayOfWeek] || 0) + duration;
    }

    return Array.from(weekMap.values()).sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
  }

  /**
   * Calculate monthly workload for a teacher
   */
  async calculateMonthlyWorkload(
    teacherId: string,
    year: number
  ): Promise<MonthlyWorkload[]> {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);

    const schedules = await prisma.schedule.findMany({
      where: {
        subject: { teacherId },
        createdAt: {
          gte: startOfYear,
          lte: endOfYear,
        },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    // Group by month
    const monthMap = new Map<number, MonthlyWorkload>();

    for (let month = 0; month < 12; month++) {
      monthMap.set(month, {
        year,
        month: month + 1,
        totalHours: 0,
        scheduleCount: 0,
        weeklyBreakdown: [],
      });
    }

    for (const schedule of schedules) {
      const scheduleDate = schedule.createdAt;
      const month = scheduleDate.getMonth();

      const monthWorkload = monthMap.get(month)!;
      const duration = this.calculateDuration(schedule.startTime, schedule.endTime);
      monthWorkload.totalHours += duration;
      monthWorkload.scheduleCount += 1;
    }

    // Calculate weekly breakdown for each month
    for (const [month, workload] of monthMap.entries()) {
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);
      workload.weeklyBreakdown = await this.calculateWeeklyWorkload(teacherId, monthStart, monthEnd);
    }

    return Array.from(monthMap.values()).filter((m) => m.totalHours > 0);
  }

  /**
   * Get full workload summary for a teacher
   */
  async getTeacherWorkloadSummary(
    teacherId: string,
    year?: number
  ): Promise<TeacherWorkloadSummary> {
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      include: { user: { select: { name: true } } },
    });

    if (!teacher) {
      throw new Error('Teacher not found');
    }

    const currentYear = year || new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31);

    const [weekly, monthly] = await Promise.all([
      this.calculateWeeklyWorkload(teacherId, startOfYear, endOfYear),
      this.calculateMonthlyWorkload(teacherId, currentYear),
    ]);

    const totalHours = weekly.reduce((sum, w) => sum + w.totalHours, 0);
    const averageWeeklyHours = weekly.length > 0 ? totalHours / weekly.length : 0;

    return {
      teacherId,
      teacherName: teacher.user.name,
      weekly,
      monthly,
      averageWeeklyHours: Math.round(averageWeeklyHours * 100) / 100,
    };
  }

  /**
   * Get workload for all teachers
   */
  async getAllTeachersWorkload(year?: number): Promise<TeacherWorkloadSummary[]> {
    const teachers = await prisma.teacher.findMany({
      include: { user: { select: { name: true } } },
    });

    const results: TeacherWorkloadSummary[] = [];
    for (const teacher of teachers) {
      try {
        const summary = await this.getTeacherWorkloadSummary(teacher.id, year);
        results.push(summary);
      } catch (err) {
        console.error(`Failed to calculate workload for teacher ${teacher.id}:`, err);
      }
    }

    return results;
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday as first day
    return new Date(d.setDate(diff));
  }

  private getDateForDayOfWeek(dayOfWeek: number, referenceDate: Date): Date {
    // dayOfWeek: 1 = Monday, 7 = Sunday
    const d = new Date(referenceDate);
    const currentDay = d.getDay() || 7; // Convert Sunday (0) to 7
    const diff = dayOfWeek - currentDay;
    d.setDate(d.getDate() + diff);
    return d;
  }
}

export const workloadCalculationService = new WorkloadCalculationService();
export default workloadCalculationService;

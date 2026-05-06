import prisma from '../utils/prisma.js';

export interface CreateCalendarEventDto {
  title: string;
  type: string;
  startDate: string;
  endDate: string;
  description?: string;
  affectsAttendance?: boolean;
  affectsWorkload?: boolean;
}

export interface UpdateCalendarEventDto extends Partial<CreateCalendarEventDto> {}

export class CalendarService {
  /**
   * Create a new calendar event
   */
  async createEvent(data: CreateCalendarEventDto) {
    return prisma.calendarEvent.create({
      data: {
        title: data.title,
        type: data.type as any,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        description: data.description,
        affectsAttendance: data.affectsAttendance ?? false,
        affectsWorkload: data.affectsWorkload ?? false,
      },
    });
  }

  /**
   * Get all events with optional date range filter
   */
  async getEvents(startDate?: Date, endDate?: Date) {
    const where: any = {};
    if (startDate || endDate) {
      where.startDate = {};
      if (startDate) where.startDate.gte = startDate;
      if (endDate) where.endDate = { lte: endDate };
    }
    return prisma.calendarEvent.findMany({
      where,
      orderBy: { startDate: 'asc' },
    });
  }

  /**
   * Get events by type
   */
  async getEventsByType(type: string, startDate?: Date, endDate?: Date) {
    const where: any = { type };
    if (startDate || endDate) {
      where.AND = [
        { startDate: { gte: startDate } },
        { endDate: { lte: endDate } },
      ];
    }
    return prisma.calendarEvent.findMany({
      where,
      orderBy: { startDate: 'asc' },
    });
  }

  /**
   * Get single event by ID
   */
  async getEventById(id: string) {
    return prisma.calendarEvent.findUnique({ where: { id } });
  }

  /**
   * Update event
   */
  async updateEvent(id: string, data: UpdateCalendarEventDto) {
    const updateData: any = { ...data };
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.endDate) updateData.endDate = new Date(data.endDate);
    delete updateData.id;

    return prisma.calendarEvent.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Delete event
   */
  async deleteEvent(id: string) {
    return prisma.calendarEvent.delete({ where: { id } });
  }

  /**
   * Check if a specific date falls within any calendar event
   * Returns the event if found, null otherwise
   */
  async getEventForDate(date: Date): Promise<any | null> {
    const events = await prisma.calendarEvent.findMany({
      where: {
        startDate: { lte: date },
        endDate: { gte: date },
      },
    });
    return events.length > 0 ? events[0] : null;
  }

  /**
   * Check if attendance should be blocked for a date
   * Weekends (Saturday=6, Sunday=0) are automatically blocked
   */
  async isAttendanceBlocked(date: Date): Promise<boolean> {
    const day = date.getDay();
    // Saturday (6) and Sunday (0) are automatically holidays
    if (day === 0 || day === 6) {
      return true;
    }
    const event = await this.getEventForDate(date);
    return event ? event.affectsAttendance : false;
  }

  /**
   * Check if workload should be excluded for a date
   */
  async isWorkloadExcluded(date: Date): Promise<boolean> {
    const event = await this.getEventForDate(date);
    return event ? event.affectsWorkload : false;
  }

  /**
   * Get all dates within a range that are affected by calendar events
   */
  async getAffectedDates(startDate: Date, endDate: Date, affectsField: 'affectsAttendance' | 'affectsWorkload'): Promise<Date[]> {
    const events = await prisma.calendarEvent.findMany({
      where: {
        [affectsField]: true,
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });

    const affectedDates: Date[] = [];
    for (const event of events) {
      let current = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      while (current <= eventEnd) {
        if (current >= startDate && current <= endDate) {
          affectedDates.push(new Date(current));
        }
        current.setDate(current.getDate() + 1);
      }
    }
    return affectedDates;
  }
}

export const calendarService = new CalendarService();
export default calendarService;

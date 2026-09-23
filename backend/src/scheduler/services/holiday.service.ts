import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { PrismaService } from '../../prisma/prisma.service';
import { PublicHoliday } from '../dto/scheduler.dto';

export type LocalDate = string; // YYYY-MM-DD

@Injectable()
export class HolidayService {
    constructor(private readonly prisma: PrismaService) { }


    async getForDate(date: LocalDate): Promise<PublicHoliday | null> {

        const queryDate = DateTime.fromISO(date, { zone: 'utc' }).toJSDate();

        const holiday = await this.prisma.publicHoliday.findFirst({
            where: {
                date: queryDate,
            },
        });

        if (!holiday) return null;

        return this.mapToDomain(holiday);
    }

    /**
     * Every public holiday falling inside the 7-day span starting at weekStart.
     */
    async getForWeek(weekStart: LocalDate): Promise<PublicHoliday[]> {
        const startDt = DateTime.fromISO(weekStart, { zone: 'utc' });
        const endDt = startDt.plus({ days: 7 });

        const holidays = await this.prisma.publicHoliday.findMany({
            where: {
                date: {
                    gte: startDt.toJSDate(),
                    lt: endDt.toJSDate(),
                },
            },
            orderBy: {
                date: 'asc',
            },
        });

        return holidays.map(this.mapToDomain);
    }


    private mapToDomain(dbHoliday: any): PublicHoliday {
        return {
            id: dbHoliday.id,
            date: dbHoliday.date.toISOString().split('T')[0],
            name: dbHoliday.name,
            createdAt: dbHoliday.createdAt.toISOString(),
            updatedAt: dbHoliday.updatedAt.toISOString(),
        };
    }
}
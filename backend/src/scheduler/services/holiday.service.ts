import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { DateTime } from 'luxon';
import { PublicHoliday as PrismaPublicHoliday } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PublicHoliday } from '../dto/scheduler.dto';
import { LocalDate } from './time.service';

@Injectable()
export class HolidayService {
  private readonly logger = new Logger(HolidayService.name);

  constructor(private readonly prisma: PrismaService) { }

  async getForDate(date: string | LocalDate): Promise<PublicHoliday | null> {
    const queryDate = this.parseLocalDate(date).toJSDate();

    const holiday = await this.prisma.publicHoliday.findFirst({
      where: {
        date: queryDate,
      },
    });

    if (!holiday) return null;

    return this.mapToDomain(holiday);
  }

  /**
   * Every public holiday falling inside the 7-day span starting at weekStart (a Monday),
   */
  async getForWeek(weekStart: string | LocalDate): Promise<PublicHoliday[]> {
    const startDt = this.parseLocalDate(weekStart);

    if (startDt.weekday !== 1) {
      throw new BadRequestException(`weekStart must be a Monday, got ${startDt.toFormat('yyyy-MM-dd')}`);
    }

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

    if (holidays.length === 0) {
      await this.warnIfYearUnseeded(startDt.year);
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return holidays.map((h: PrismaPublicHoliday) => this.mapToDomain(h));
  }

  // --- Helpers ---

  private parseLocalDate(date: string | LocalDate): DateTime {
    const dt = DateTime.fromFormat(date as string, 'yyyy-MM-dd', { zone: 'utc' });

    if (!dt.isValid) {
      throw new BadRequestException(`Invalid date (expected YYYY-MM-DD): ${dt.invalidReason ?? date}`);
    }

    return dt;
  }

  private async warnIfYearUnseeded(year: number): Promise<void> {
    const yearStart = DateTime.utc(year, 1, 1);

    const count = await this.prisma.publicHoliday.count({
      where: {
        date: {
          gte: yearStart.toJSDate(),
          lt: yearStart.plus({ years: 1 }).toJSDate(),
        },
      },
    });

    if (count === 0) {
      this.logger.warn(
        `No public holiday data is seeded for ${year}; availability for weeks in ${year} will ignore public holidays.`
      );
    }
  }

  private mapToDomain(dbHoliday: PrismaPublicHoliday): PublicHoliday {
    return {
      id: dbHoliday.id,
      date: DateTime.fromJSDate(dbHoliday.date, { zone: 'utc' }).toFormat('yyyy-MM-dd') as LocalDate,
      name: dbHoliday.name,
      createdAt: dbHoliday.createdAt.toISOString(),
      updatedAt: dbHoliday.updatedAt.toISOString(),
    };
  }
}
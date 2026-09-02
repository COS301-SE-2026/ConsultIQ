import { Injectable, Logger } from '@nestjs/common';
import { RawConsultantDto } from '../../dto/raw-consultant.dto';
import { RawProjectDto } from '../../dto/raw-project.dto';
import { FactorScoreResult } from '../interfaces/factor-score-result.interface';
import { LocationService } from '../../../location/services/location.service';

export interface TravelMetrics {
  distanceMeters: number;
  durationSeconds: number;
  distanceText?: string;
  durationText?: string;
}

interface CacheEntry {
  metrics: TravelMetrics | null;
  expiresAt: number;
}

@Injectable()
export class GeographicFitScorer {
  private readonly logger = new Logger(GeographicFitScorer.name);

  private static readonly DECAY_CONSTANT_MINUTES = 45;
  private static readonly DECAY_CONSTANT_KM = 40;
  private static readonly MIN_SCORE = 0.1;

  private static readonly FALLBACK_SAME_CITY_SCORE = 0.8;
  private static readonly FALLBACK_SAME_PROVINCE_SCORE = 0.5;
  private static readonly FALLBACK_DIFFERENT_PROVINCE_SCORE = 0.1;

  private readonly distanceCache = new Map<string, CacheEntry>();
  private readonly pendingRequests = new Map<
    string,
    Promise<TravelMetrics | null>
  >();

  private static readonly MAX_CACHE_SIZE = 5000;
  private static readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000;
  private static readonly ERROR_TTL_MS = 5 * 60 * 1000;

  constructor(private readonly locationService: LocationService) {}

  async score(
    consultant: RawConsultantDto,
    project: RawProjectDto,
  ): Promise<FactorScoreResult> {
    // const isRemote = project.workModel?.toUpperCase() === 'REMOTE' || project.isRemote;
    // if (isRemote) {
    //   return {
    //     score: 1.0,
    //     triggerHardExclusion: false,
    //     details: 'Project is fully remote. Geographic fit is bypassed.',
    //     dataSource: 'remote',
    //   };
    // }

    const hasConsultantCoords = consultant.latitude && consultant.longitude;
    const hasProjectCoords = project.latitude && project.longitude;

    if (hasConsultantCoords && hasProjectCoords) {
      const metrics = await this.getTravelMetrics(consultant, project);
      if (metrics) {
        return this.scoreFromMetrics(metrics);
      }
    } else {
      this.logger.debug('Coordinates missing for consultant or project.');
    }

    return this.scoreFromStringMatch(consultant, project);
  }

  private async getTravelMetrics(
    consultant: RawConsultantDto,
    project: RawProjectDto,
  ): Promise<TravelMetrics | null> {
    const cacheKey = this.buildCacheKey(consultant, project);
    const now = Date.now();

    const cached = this.distanceCache.get(cacheKey);
    if (cached) {
      if (cached.expiresAt > now) {
        this.distanceCache.delete(cacheKey);
        this.distanceCache.set(cacheKey, cached);
        return cached.metrics;
      }
      this.distanceCache.delete(cacheKey);
    }

    if (!this.pendingRequests.has(cacheKey)) {
      const origin = `${consultant.latitude},${consultant.longitude}`;
      const destination = `${project.latitude},${project.longitude}`;

      const requestPromise = this.locationService
        .calculateTravelMetrics(origin, destination)
        .then((res: TravelMetrics | null) => {
          if (!this.isValidMetrics(res)) {
            this.logger.warn(
              `Malformed metrics for ${cacheKey}. Treating as failure.`,
              res,
            );
            this.setCache(cacheKey, null, GeographicFitScorer.ERROR_TTL_MS);
            return null;
          }
          this.setCache(cacheKey, res, GeographicFitScorer.CACHE_TTL_MS);
          return res;
        })
        .catch((error) => {
          this.logger.warn(
            `API failed for ${cacheKey}. Triggering negative cache.`,
            error,
          );
          this.setCache(cacheKey, null, GeographicFitScorer.ERROR_TTL_MS);
          return null;
        })
        .finally(() => {
          this.pendingRequests.delete(cacheKey);
        });

      this.pendingRequests.set(cacheKey, requestPromise);
    }

    return this.pendingRequests.get(cacheKey)!;
  }

  private buildCacheKey(
    consultant: RawConsultantDto,
    project: RawProjectDto,
  ): string {
    const cLat = Number(consultant.latitude).toFixed(2);
    const cLng = Number(consultant.longitude).toFixed(2);
    const pLat = Number(project.latitude).toFixed(2);
    const pLng = Number(project.longitude).toFixed(2);
    return `${cLat},${cLng}|${pLat},${pLng}`;
  }

  private isValidMetrics(res: unknown): res is TravelMetrics {
    return (
      !!res &&
      typeof (res as TravelMetrics).distanceMeters === 'number' &&
      Number.isFinite((res as TravelMetrics).distanceMeters) &&
      typeof (res as TravelMetrics).durationSeconds === 'number' &&
      Number.isFinite((res as TravelMetrics).durationSeconds)
    );
  }

  private scoreFromMetrics(metrics: TravelMetrics): FactorScoreResult {
    const distanceKm = metrics.distanceMeters / 1000;
    const durationMinutes = metrics.durationSeconds / 60;

    if (metrics.durationSeconds > 0) {
      const rawScore = Math.exp(
        -durationMinutes / GeographicFitScorer.DECAY_CONSTANT_MINUTES,
      );
      return {
        score: Math.max(GeographicFitScorer.MIN_SCORE, rawScore),
        triggerHardExclusion: false,
        details: `Travel time: ${durationMinutes.toFixed(0)} mins (${distanceKm.toFixed(1)} km).`,
        dataSource: 'api-duration',
      };
    }

    const rawScore = Math.exp(
      -distanceKm / GeographicFitScorer.DECAY_CONSTANT_KM,
    );
    return {
      score: Math.max(GeographicFitScorer.MIN_SCORE, rawScore),
      triggerHardExclusion: false,
      details: `Distance: ${distanceKm.toFixed(1)} km.`,
      dataSource: 'api-distance',
    };
  }

  private scoreFromStringMatch(
    consultant: RawConsultantDto,
    project: RawProjectDto,
  ): FactorScoreResult {
    const cCity = consultant.city?.trim().toLowerCase() || '';
    const cProv = consultant.province?.trim().toLowerCase() || '';
    const pCity = project.city?.trim().toLowerCase() || '';
    const pProv = project.province?.trim().toLowerCase() || '';

    if (cCity && pCity && cCity === pCity) {
      return {
        score: GeographicFitScorer.FALLBACK_SAME_CITY_SCORE,
        triggerHardExclusion: false,
        details: `Located in the exact project city (${consultant.city}, ${consultant.province})`,
        dataSource: 'fallback',
      };
    }

    if (cProv && pProv && cProv === pProv) {
      return {
        score: GeographicFitScorer.FALLBACK_SAME_PROVINCE_SCORE,
        triggerHardExclusion: false,
        details: `Located in the same province (${consultant.province}), but a different city`,
        dataSource: 'fallback',
      };
    }

    return {
      score: GeographicFitScorer.FALLBACK_DIFFERENT_PROVINCE_SCORE,
      triggerHardExclusion: false,
      details: `Located in (${consultant.province}). Project requires ${project.province}`,
      dataSource: 'fallback',
    };
  }

  private setCache(
    key: string,
    metrics: TravelMetrics | null,
    ttlMs: number,
  ): void {
    if (this.distanceCache.size >= GeographicFitScorer.MAX_CACHE_SIZE) {
      const oldestKey = this.distanceCache.keys().next().value;
      if (oldestKey !== undefined) {
        this.distanceCache.delete(oldestKey);
      }
    }
    this.distanceCache.delete(key);
    this.distanceCache.set(key, { metrics, expiresAt: Date.now() + ttlMs });
  }
}

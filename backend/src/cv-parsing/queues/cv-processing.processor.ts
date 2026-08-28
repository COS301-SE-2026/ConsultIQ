import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { CvExtractionService } from '../services/cv-extraction.service';
import { CV_PROCESSING_QUEUE } from './cv-processing.queue';

@Processor(CV_PROCESSING_QUEUE)
@Injectable()
export class CvProcessingProcessor extends WorkerHost {
  constructor(private readonly cvExtraction: CvExtractionService) {
    super();
  }

  async process(job: Job<{ cvFileId: string }>): Promise<void> {
    await this.cvExtraction.processExtraction(job.data.cvFileId);
  }
}
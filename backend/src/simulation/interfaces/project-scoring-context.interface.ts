import { RawProjectDto } from '../../scoring/dto/raw-project.dto';
import { DataIngestionService } from '../../scoring/services/data-normalization/data-ingestion.service';

/**
 * Everything about a project's scoring setup that is the SAME
 * regardless of which consultant (or hypothetical variant of a
 * consultant) is being scored against it. Resolved once per project
 * and reused across every candidate-skill scoring pass.
 */
export interface ProjectScoringContext {
  projectDto: RawProjectDto;
  scoringContext: Awaited<ReturnType<DataIngestionService['getProjectScoringContext']>>;
  allocationsByConsultant: ReadonlyMap<string, number>;
}
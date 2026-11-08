import { Experiment } from '../types';
import { getExperiments, toExperiment, getExperimentBySlug } from '../lib/content';

// Re-export dynamically loaded MDX experiments without any hardcoded demo experiments
export const EXPERIMENTS: Experiment[] = getExperiments().map(toExperiment);

export function findExperimentBySlug(slug: string, options?: { includeDrafts?: boolean }): Experiment | undefined {
  const doc = getExperimentBySlug(slug, options);
  return doc ? toExperiment(doc) : undefined;
}

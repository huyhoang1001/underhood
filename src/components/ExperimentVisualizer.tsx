import React from 'react';
import { NodeThreadpoolVisualizer } from './NodeThreadpoolVisualizer';
import { TokioSchedulerVisualizer } from './TokioSchedulerVisualizer';

interface ExperimentVisualizerProps {
  type?: string;
}

export const ExperimentVisualizer: React.FC<ExperimentVisualizerProps> = ({ type }) => {
  if (type === 'tokio-scheduler') return <TokioSchedulerVisualizer />;
  return <NodeThreadpoolVisualizer />;
};

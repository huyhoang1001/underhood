import React from 'react';
import { NodeThreadpoolVisualizer } from './NodeThreadpoolVisualizer';
import { TokioSchedulerVisualizer } from './TokioSchedulerVisualizer';
import { GoSchedulerSimulator } from './GoSchedulerSimulator';

interface ExperimentVisualizerProps {
  type?: string;
}

export const ExperimentVisualizer: React.FC<ExperimentVisualizerProps> = ({ type }) => {
  if (type === 'tokio-scheduler') return <TokioSchedulerVisualizer />;
  if (type === 'go-scheduler') return <GoSchedulerSimulator />;
  return <NodeThreadpoolVisualizer />;
};

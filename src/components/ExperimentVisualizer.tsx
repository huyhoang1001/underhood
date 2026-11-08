import React from 'react';
import { NodeThreadpoolVisualizer } from './NodeThreadpoolVisualizer';

interface ExperimentVisualizerProps {
  type?: string;
}

export const ExperimentVisualizer: React.FC<ExperimentVisualizerProps> = () => {
  return <NodeThreadpoolVisualizer />;
};

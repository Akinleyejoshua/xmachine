import {
  ProjectDomain,
  FileType,
  TransformAction,
  ModelLayer,
  Hyperparameters,
  LossFunctionType,
  OptimizerType,
  LayerType
} from '../../types/pipeline';

export interface PreprocessingOption {
  id: string;
  type: string;
  label: string;
  category: 'Preprocessing' | 'Augmentation' | 'Feature Engineering' | 'Text Preprocessing';
  description: string;
  defaultParams: Record<string, any>;
}

export interface LayerOption {
  id: LayerType;
  label: string;
  description: string;
  category: 'Convolutional' | 'Fully Connected' | 'Sequence / Embedding' | 'Adapters / Attention';
  defaultParams: Record<string, any>;
}

export interface LossFunctionOption {
  id: LossFunctionType | string;
  label: string;
  description: string;
}

export interface MetricOption {
  id: string;
  label: string;
  color: string; // Tailwind color class or hex, e.g. 'text-royalblue-500'
  isMain?: boolean;
}

export interface SandboxBlueprint {
  inputType: 'image' | 'text' | 'noise' | 'image-to-image' | 'time-series';
  outputType: 'classification' | 'object-detection' | 'text-generation' | 'image-generation' | 'time-series';
  inputTitle: string;
  inputPlaceholder: string;
  primaryBtnText: string;
  outputTitle: string;
  defaultMockResult: (input: any, classNames: string[]) => any;
  bulkMockResult: (fileName: string, classNames: string[]) => any;
}

export interface DomainConfig {
  id: ProjectDomain;
  displayName: string;
  description: string;
  
  // 1. Data Pipeline Schema
  pipeline: {
    allowedExtensions: string[];
    allowedFileTypes: FileType[];
    ingestionFormats: { id: string; label: string }[];
    preprocessingOptions: PreprocessingOption[];
    defaultActions: TransformAction[];
    defaultClassNames?: string[];
  };

  // 2. Model Builder Layout
  modelBuilder: {
    layerOptions: LayerOption[];
    lossFunctions: LossFunctionOption[];
    defaultLayers: ModelLayer[];
    defaultHyperparameters: Hyperparameters;
  };

  // 3. Live Training Config
  training: {
    metrics: MetricOption[];
    // Generator for simulated epoch metrics
    generateMockMetrics: (
      epoch: number,
      maxEpochs: number,
      initialLr: number
    ) => Record<string, number>;
  };

  // 4. Inference Sandbox Input/Output Blueprint
  sandbox: SandboxBlueprint;
}

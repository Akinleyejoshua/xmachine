export type ProjectDomain =
  | 'cv-classification'
  | 'object-detection'
  | 'nlp'
  | 'gans'
  | 'llm-finetuning'
  | 'time-series-forecasting';

export interface ProjectMeta {
  id: string;
  name: string;
  domain: ProjectDomain;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// Ingestion & ETL Data Types
// ==========================================

export type FileType = 'csv' | 'json' | 'txt' | 'image';

export interface DatasetFile {
  id: string;
  name: string;
  size: number;
  type: FileType;
  rawContent?: string | ArrayBuffer; // Cache raw content for in-memory processing
  previewData?: any[]; // Preview rows or image URLs
}

export type TextTransformActionType =
  | 'lowercase'
  | 'remove-stopwords'
  | 'tokenize'
  | 'missing-values-impute'
  | 'standard-scale'
  | 'normalize';

export type ImageTransformActionType =
  | 'resize'
  | 'pixel-normalize-0-1'
  | 'pixel-normalize-1-1'
  | 'grayscale'
  | 'augment-flip'
  | 'augment-rotate'
  | 'augment-brightness'
  | 'augment-zoom';

export type TimeSeriesTransformActionType =
  | 'temporal-alignment'
  | 'sequence-windowing'
  | 'stationarity-transforms'
  | 'sequence-imputation';

export interface TransformAction {
  id: string;
  type: TextTransformActionType | ImageTransformActionType | TimeSeriesTransformActionType;
  params: Record<string, any>;
  enabled: boolean;
}

export interface SplitRatio {
  train: number;  // 0-100
  val: number;    // 0-100
  test: number;   // 0-100 (0 = disabled)
}

export interface ETLPipeline {
  files: DatasetFile[];
  actions: TransformAction[];
  batchSize: number;
  shuffle: boolean;
  classNames: string[];
  splitRatio: SplitRatio;
  seed: number;
  stratified: boolean;
}

// ==========================================
// Model Configuration & Layers
// ==========================================

export type LayerType =
  | 'conv2d'
  | 'maxPooling2d'
  | 'flatten'
  | 'dense'
  | 'embedding'
  | 'lstm'
  | 'bidirectional'
  | 'gru'
  | 'dropout'
  | 'batchNorm'
  | 'conv1d'
  | 'attention'
  | 'arima';

export interface ModelLayer {
  id: string;
  type: LayerType;
  config: Record<string, any>; // layer parameters (filters, kernelSize, units, activation, inputShape, etc.)
}

export type OptimizerType = 'adam' | 'sgd' | 'rmsprop';
export type LossFunctionType =
  | 'categoricalCrossentropy'
  | 'meanSquaredError'
  | 'binaryCrossentropy'
  | 'sparseCategoricalCrossentropy'
  | 'meanAbsoluteError'
  | 'quantileLoss';

export interface Hyperparameters {
  optimizer: OptimizerType;
  loss: LossFunctionType;
  learningRate: number;
  batchSize: number;
  epochs: number;
}

// ==========================================
// Training State & Checkpoints
// ==========================================

export interface TrainingMetric {
  epoch: number;
  loss: number;
  accuracy?: number;
  valLoss?: number;
  valAccuracy?: number;
  perplexity?: number;
  tokens_per_sec?: number;
  mAP?: number;
  mAP_50?: number;
  g_loss?: number;
  d_loss?: number;
  fid?: number;
  mae?: number;
  val_mae?: number;
  [key: string]: any;
}

export type TrainingStatus = 'idle' | 'training' | 'paused' | 'completed' | 'failed';

export interface Checkpoint {
  epoch: number;
  timestamp: string;
  fileSize: number;
  checkpointUrl: string;
  modelArtifact?: any;
}

export interface ModelConfig {
  layers: ModelLayer[];
  hyperparameters: Hyperparameters;
}

// ==========================================
// Complete Pipeline Global State Structure
// ==========================================

export interface PipelineState {
  // Onboarding & Project setup
  currentProject: ProjectMeta | null;
  wizardOpen: boolean;

  // Ingestion & ETL
  etl: ETLPipeline;

  // Model Builder
  modelConfig: ModelConfig;

  // Live Training
  trainingStatus: TrainingStatus;
  metricsHistory: TrainingMetric[];
  currentEpoch: number;
  checkpoints: Checkpoint[];

  // Inference Sandbox
  inferenceInput: any;
  inferenceResult: any;
  inferenceActive: boolean;

  // Theme settings
  theme: 'light' | 'dark';
}

export interface PipelineActions {
  // Project Actions
  initProject: (name: string, domain: ProjectDomain) => void;
  loadProject: (project: any) => void;
  saveProjectProgress: () => Promise<void>;
  resetProject: () => void;
  setWizardOpen: (open: boolean) => void;
  toggleTheme: () => void;

  // Ingestion & ETL Actions
  addFiles: (files: DatasetFile[]) => void;
  removeFile: (fileId: string) => void;
  setClassNames: (classNames: string[]) => void;
  updateEtlConfig: (config: Partial<ETLPipeline>) => void;
  addAction: (action: TransformAction) => void;
  removeAction: (actionId: string) => void;
  updateActionParams: (actionId: string, params: Record<string, any>) => void;
  toggleAction: (actionId: string) => void;

  // Model Builder Actions
  addLayer: (layer: ModelLayer) => void;
  removeLayer: (layerId: string) => void;
  updateLayerConfig: (layerId: string, config: Record<string, any>) => void;
  reorderLayers: (layers: ModelLayer[]) => void;
  updateHyperparameters: (params: Partial<Hyperparameters>) => void;

  // Training Actions
  setTrainingStatus: (status: TrainingStatus) => void;
  updateMetrics: (metric: TrainingMetric) => void;
  setCurrentEpoch: (epoch: number) => void;
  addCheckpoint: (checkpoint: Checkpoint, modelArtifact?: any) => Promise<void>;
  clearTrainingState: () => void;

  // Sandbox Inference Actions
  setInferenceInput: (input: any) => void;
  setInferenceResult: (result: any) => void;
  setInferenceActive: (active: boolean) => void;
}

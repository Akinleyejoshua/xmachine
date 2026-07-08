import mongoose, { Schema, Document } from 'mongoose';
import { ProjectDomain, ModelConfig, ETLPipeline, TrainingMetric, Checkpoint } from '../types/pipeline';

export interface ModelArtifact {
  epoch: number;
  topology: any;
  weightSpecs: any[];
  weightData: string;
  savedAt: string;
}

export interface IProject extends Document {
  name: string;
  domain: ProjectDomain;
  etl: ETLPipeline;
  modelConfig: ModelConfig;
  metricsHistory: TrainingMetric[];
  checkpoints: Checkpoint[];
  modelArtifact?: ModelArtifact | null;
  latestModelCheckpointEpoch?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    domain: { 
      type: String, 
      required: true, 
      enum: ['cv-classification', 'object-detection', 'nlp', 'gans', 'llm-finetuning', 'time-series-forecasting'] 
    },
    etl: {
      files: [{
        id: String,
        name: String,
        size: Number,
        type: { type: String, enum: ['csv', 'json', 'txt', 'image'] },
        rawContent: String
      }],
      actions: [{
        id: String,
        type: { type: String },
        params: Schema.Types.Mixed,
        enabled: Boolean
      }],
      batchSize: { type: Number, default: 32 },
      shuffle: { type: Boolean, default: true },
      classNames: [{ type: String }],
      splitRatio: {
        train: { type: Number, default: 80 },
        val: { type: Number, default: 20 },
        test: { type: Number, default: 0 }
      },
      seed: { type: Number, default: 42 },
      stratified: { type: Boolean, default: true }
    },
    modelConfig: {
      layers: [{
        id: String,
        type: { type: String },
        config: Schema.Types.Mixed
      }],
      hyperparameters: {
        optimizer: { type: String, default: 'adam' },
        loss: { type: String, default: 'categoricalCrossentropy' },
        learningRate: { type: Number, default: 0.001 },
        batchSize: { type: Number, default: 32 },
        epochs: { type: Number, default: 10 }
      }
    },
    metricsHistory: [Schema.Types.Mixed],
    checkpoints: [{
      epoch: Number,
      timestamp: String,
      fileSize: Number,
      checkpointUrl: String,
      modelArtifact: Schema.Types.Mixed
    }],
    modelArtifact: {
      epoch: Number,
      topology: Schema.Types.Mixed,
      weightSpecs: [Schema.Types.Mixed],
      weightData: { type: String, default: '' },
      weightDataLength: { type: Number, default: 0 },
      savedAt: String
    },
    latestModelCheckpointEpoch: { type: Number, default: null }
  },
  { timestamps: true }
);

export default mongoose.models.StudioWorkspaceProject || mongoose.model<IProject>('StudioWorkspaceProject', ProjectSchema, 'studio_workspace_projects');

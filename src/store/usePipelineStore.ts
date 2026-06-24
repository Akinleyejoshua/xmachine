import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  PipelineState,
  PipelineActions,
  ProjectDomain,
  ModelLayer,
  TransformAction,
  Hyperparameters,
} from '../types/pipeline';

const DEFAULT_HYPERPARAMETERS: Hyperparameters = {
  optimizer: 'adam',
  loss: 'categoricalCrossentropy',
  learningRate: 0.001,
  batchSize: 32,
  epochs: 10,
};

const getDomainDefaults = (domain: ProjectDomain) => {
  let defaultLayers: ModelLayer[] = [];
  let defaultActions: TransformAction[] = [];
  let defaultHyperparameters: Hyperparameters = { ...DEFAULT_HYPERPARAMETERS };

  switch (domain) {
    case 'cv-classification':
    case 'object-detection':
      defaultActions = [
        { id: 'img-resize', type: 'resize', params: { width: 224, height: 224 }, enabled: true },
        { id: 'img-norm', type: 'pixel-normalize-0-1', params: {}, enabled: true },
      ];
      defaultLayers = [
        { id: 'conv-1', type: 'conv2d', config: { filters: 32, kernelSize: 3, activation: 'relu', inputShape: [224, 224, 3] } },
        { id: 'pool-1', type: 'maxPooling2d', config: { poolSize: 2 } },
        { id: 'flatten-1', type: 'flatten', config: {} },
        { id: 'dense-1', type: 'dense', config: { units: 64, activation: 'relu' } },
        { id: 'output', type: 'dense', config: { units: 10, activation: 'softmax' } },
      ];
      break;

    case 'nlp':
      defaultActions = [
        { id: 'text-lower', type: 'lowercase', params: {}, enabled: true },
        { id: 'text-tokenize', type: 'tokenize', params: { vocabularySize: 5000, sequenceLength: 100 }, enabled: true },
      ];
      defaultLayers = [
        { id: 'embed-1', type: 'embedding', config: { inputDim: 5000, outputDim: 128, inputLength: 100 } },
        { id: 'lstm-1', type: 'lstm', config: { units: 64, returnSequences: false } },
        { id: 'output', type: 'dense', config: { units: 2, activation: 'softmax' } },
      ];
      defaultHyperparameters.loss = 'binaryCrossentropy';
      break;

    case 'gans':
      defaultActions = [
        { id: 'gan-norm', type: 'pixel-normalize-1-1', params: {}, enabled: true },
      ];
      defaultLayers = [
        { id: 'dense-gen', type: 'dense', config: { units: 256, activation: 'leakyRelu', inputShape: [100] } },
        { id: 'dense-gen-out', type: 'dense', config: { units: 784, activation: 'tanh' } },
      ];
      defaultHyperparameters.loss = 'meanSquaredError';
      break;

    case 'llm-finetuning':
      defaultActions = [
        { id: 'llm-tokenize', type: 'tokenize', params: { tokenizer: 'llama-style' }, enabled: true },
      ];
      defaultLayers = [
        { id: 'llm-lora-adapter', type: 'dense', config: { r: 8, loraAlpha: 16, targetModules: ['q_proj', 'v_proj'] } },
      ];
      defaultHyperparameters.optimizer = 'adam';
      defaultHyperparameters.loss = 'sparseCategoricalCrossentropy';
      break;
  }

  return { defaultLayers, defaultActions, defaultHyperparameters };
};

export const usePipelineStore = create<PipelineState & PipelineActions>()(
  devtools(
    (set) => ({
      // Initial state
      currentProject: null,
      wizardOpen: true,
      etl: {
        files: [],
        actions: [],
        batchSize: 32,
        shuffle: true,
        classNames: ['Cat', 'Dog', 'Bird'],
        splitRatio: { train: 80, val: 20, test: 0 },
        seed: 42,
        stratified: true,
      },
      modelConfig: {
        layers: [],
        hyperparameters: DEFAULT_HYPERPARAMETERS,
      },
      trainingStatus: 'idle',
      metricsHistory: [],
      currentEpoch: 0,
      checkpoints: [],
      inferenceInput: null,
      inferenceResult: null,
      inferenceActive: false,
      theme: 'dark',

      // Actions
      initProject: async (name, domain) => {
        const { defaultLayers, defaultActions, defaultHyperparameters } = getDomainDefaults(domain);
        
        const payload = {
          name,
          domain,
          etl: {
            files: [],
            actions: defaultActions,
            batchSize: 32,
            shuffle: true,
            classNames: ['Cat', 'Dog', 'Bird'],
          },
          modelConfig: {
            layers: defaultLayers,
            hyperparameters: defaultHyperparameters,
          },
        };

        try {
          const response = await fetch('/api/projects', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });
          const result = await response.json();
          if (result.success && result.data) {
            set({
              currentProject: {
                id: result.data._id,
                name: result.data.name,
                domain: result.data.domain,
                createdAt: result.data.createdAt,
                updatedAt: result.data.updatedAt,
              },
              wizardOpen: false,
          etl: result.data.etl || {
            files: [],
            actions: [],
            batchSize: 32,
            shuffle: true,
            classNames: ['Cat', 'Dog', 'Bird'],
            splitRatio: { train: 80, val: 20, test: 0 },
            seed: 42,
            stratified: true,
          },
              modelConfig: result.data.modelConfig,
              trainingStatus: 'idle',
              metricsHistory: [],
              currentEpoch: 0,
              checkpoints: [],
              inferenceInput: null,
              inferenceResult: null,
              inferenceActive: false,
            });
            return;
          }
        } catch (error) {
          console.error('Failed to save project to db, falling back to local state:', error);
        }

        // Fallback local init
        set({
          currentProject: {
            id: Math.random().toString(36).substring(7),
            name,
            domain,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          wizardOpen: false,
          etl: {
            files: [],
            actions: defaultActions,
            batchSize: 32,
            shuffle: true,
            classNames: ['Cat', 'Dog', 'Bird'],
            splitRatio: { train: 80, val: 20, test: 0 },
            seed: 42,
            stratified: true,
          },
          modelConfig: {
            layers: defaultLayers,
            hyperparameters: defaultHyperparameters,
          },
          trainingStatus: 'idle',
          metricsHistory: [],
          currentEpoch: 0,
          checkpoints: [],
          inferenceInput: null,
          inferenceResult: null,
          inferenceActive: false,
        });
      },

      loadProject: (project) => {
        set({
          currentProject: {
            id: project._id,
            name: project.name,
            domain: project.domain,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
          },
          wizardOpen: false,
          etl: project.etl,
          modelConfig: project.modelConfig,
          trainingStatus: 'idle',
          metricsHistory: project.metricsHistory || [],
          checkpoints: project.checkpoints || [],
          inferenceInput: null,
          inferenceResult: null,
          inferenceActive: false,
        });
      },

      saveProjectProgress: async () => {
        const state = usePipelineStore.getState();
        if (!state.currentProject) return;

        const payload = {
          id: state.currentProject.id,
          name: state.currentProject.name,
          domain: state.currentProject.domain,
          etl: state.etl,
          modelConfig: state.modelConfig,
          metricsHistory: state.metricsHistory,
          checkpoints: state.checkpoints,
        };

        try {
          await fetch('/api/projects', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });
        } catch (error) {
          console.error('Failed to sync progress to database:', error);
        }
      },

      toggleTheme: () =>
        set((state) => {
          const newTheme = state.theme === 'dark' ? 'light' : 'dark';
          if (typeof window !== 'undefined') {
            document.documentElement.classList.remove('light', 'dark');
            document.documentElement.classList.add(newTheme);
          }
          return { theme: newTheme };
        }),

      resetProject: () =>
        set({
          currentProject: null,
          wizardOpen: true,
          etl: { files: [], actions: [], batchSize: 32, shuffle: true, classNames: ['Cat', 'Dog', 'Bird'], splitRatio: { train: 80, val: 20, test: 0 }, seed: 42, stratified: true },
          modelConfig: { layers: [], hyperparameters: DEFAULT_HYPERPARAMETERS },
          trainingStatus: 'idle',
          metricsHistory: [],
          currentEpoch: 0,
          checkpoints: [],
          inferenceInput: null,
          inferenceResult: null,
          inferenceActive: false,
        }),

      setWizardOpen: (open) => set({ wizardOpen: open }),

      addFiles: async (newFiles) => {
        set((state) => ({
          etl: {
            ...state.etl,
            files: [...state.etl.files, ...newFiles],
          },
        }));
        await usePipelineStore.getState().saveProjectProgress();
      },

      removeFile: async (fileId) => {
        set((state) => ({
          etl: {
            ...state.etl,
            files: state.etl.files.filter((f) => f.id !== fileId),
          },
        }));
        await usePipelineStore.getState().saveProjectProgress();
      },

      updateEtlConfig: async (config) => {
        set((state) => ({
          etl: { ...state.etl, ...config },
        }));
        await usePipelineStore.getState().saveProjectProgress();
      },

      setClassNames: async (names) => {
        set((state) => ({
          etl: { ...state.etl, classNames: names },
        }));
        await usePipelineStore.getState().saveProjectProgress();
      },

      addAction: async (action) => {
        set((state) => ({
          etl: {
            ...state.etl,
            actions: [...state.etl.actions, action],
          },
        }));
        await usePipelineStore.getState().saveProjectProgress();
      },

      removeAction: async (actionId) => {
        set((state) => ({
          etl: {
            ...state.etl,
            actions: state.etl.actions.filter((a) => a.id !== actionId),
          },
        }));
        await usePipelineStore.getState().saveProjectProgress();
      },

      updateActionParams: async (actionId, params) => {
        set((state) => ({
          etl: {
            ...state.etl,
            actions: state.etl.actions.map((a) =>
              a.id === actionId ? { ...a, params: { ...a.params, ...params } } : a
            ),
          },
        }));
        await usePipelineStore.getState().saveProjectProgress();
      },

      toggleAction: async (actionId) => {
        set((state) => ({
          etl: {
            ...state.etl,
            actions: state.etl.actions.map((a) =>
              a.id === actionId ? { ...a, enabled: !a.enabled } : a
            ),
          },
        }));
        await usePipelineStore.getState().saveProjectProgress();
      },

      addLayer: async (layer) => {
        set((state) => ({
          modelConfig: {
            ...state.modelConfig,
            layers: [...state.modelConfig.layers, layer],
          },
        }));
        await usePipelineStore.getState().saveProjectProgress();
      },

      removeLayer: async (layerId) => {
        set((state) => ({
          modelConfig: {
            ...state.modelConfig,
            layers: state.modelConfig.layers.filter((l) => l.id !== layerId),
          },
        }));
        await usePipelineStore.getState().saveProjectProgress();
      },

      updateLayerConfig: async (layerId, config) => {
        set((state) => ({
          modelConfig: {
            ...state.modelConfig,
            layers: state.modelConfig.layers.map((l) =>
              l.id === layerId ? { ...l, config: { ...l.config, ...config } } : l
            ),
          },
        }));
        await usePipelineStore.getState().saveProjectProgress();
      },

      reorderLayers: async (layers) => {
        set((state) => ({
          modelConfig: {
            ...state.modelConfig,
            layers,
          },
        }));
        await usePipelineStore.getState().saveProjectProgress();
      },

      updateHyperparameters: async (params) => {
        set((state) => ({
          modelConfig: {
            ...state.modelConfig,
            hyperparameters: {
              ...state.modelConfig.hyperparameters,
              ...params,
            },
          },
        }));
        await usePipelineStore.getState().saveProjectProgress();
      },

      setTrainingStatus: (status) => set({ trainingStatus: status }),

      updateMetrics: (metric) =>
        set((state) => ({
          metricsHistory: [...state.metricsHistory, metric],
        })),

      setCurrentEpoch: (epoch) => set({ currentEpoch: epoch }),

      addCheckpoint: async (checkpoint) => {
        const currentProject = usePipelineStore.getState().currentProject;
        if (currentProject) {
          try {
            await fetch('/api/checkpoints', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                projectId: currentProject.id,
                epoch: checkpoint.epoch,
                fileSize: checkpoint.fileSize,
              }),
            });
            // Auto save metrics history and parameters to DB
            await usePipelineStore.getState().saveProjectProgress();
          } catch (err) {
            console.error('Failed to sync checkpoint to db:', err);
          }
        }
        set((state) => ({
          checkpoints: [...state.checkpoints, checkpoint],
        }));
      },

      clearTrainingState: () =>
        set({
          metricsHistory: [],
          currentEpoch: 0,
          checkpoints: [],
          trainingStatus: 'idle',
        }),

      setInferenceInput: (input) => set({ inferenceInput: input }),
      setInferenceResult: (result) => set({ inferenceResult: result }),
      setInferenceActive: (active) => set({ inferenceActive: active }),
    }),
    { name: 'MLStudioStore' }
  )
);

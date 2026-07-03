import { ModelLayer, ProjectDomain } from '../types/pipeline';

let tf: typeof import('@tensorflow/tfjs') | null = null;

export async function getTf() {
  if (!tf) {
    tf = await import('@tensorflow/tfjs');
  }
  return tf;
}

export interface BuildModelOptions {
  layers: ModelLayer[];
  classCount: number;
  inputShape?: number[];
  optimizer?: string;
  learningRate?: number;
  loss?: string;
}

export async function buildModel(options: BuildModelOptions): Promise<any> {
  const t: any = await getTf();
  const { layers: modelLayers, classCount, inputShape, optimizer = 'adam', learningRate = 0.001, loss = 'categoricalCrossentropy' } = options;
  const model = t.sequential();

  if (inputShape && inputShape.length > 0) {
    model.add(t.layers.input({ inputShape: inputShape[0] === -1 ? inputShape.slice(1) : inputShape }));
  } else if (modelLayers.length > 0 && modelLayers[0].config.inputShape) {
    model.add(t.layers.input({ inputShape: modelLayers[0].config.inputShape }));
  }

  if (inputShape && inputShape.length === 1 && inputShape[0] === 100 && modelLayers[0]?.type === 'dense') {
    model.add(t.layers.embedding({ inputDim: 32000, outputDim: 64, inputLength: 100 }));
    model.add(t.layers.flatten({}));
  }

  for (const layer of modelLayers) {
    model.add(createLayer(t, layer));
  }

  const lastLayer = modelLayers[modelLayers.length - 1];
  if (!lastLayer || typeof lastLayer.config.units !== 'number' || lastLayer.config.units !== classCount) {
    const activation = classCount > 2 ? 'softmax' : 'sigmoid';
    model.add(t.layers.dense({ units: classCount, activation }));
  }

  const optimizerFn = buildOptimizer(t, optimizer, learningRate);
  const lossFn = buildLoss(t, loss);
  model.compile({ optimizer: optimizerFn, loss: lossFn, metrics: ['accuracy'] });
  return model;
}

export function createLayer(tf: any, layer: ModelLayer) {
  const cfg = { ...layer.config };

  switch (layer.type) {
    case 'conv2d': {
      const { activation, padding, strides, dropout, l2, ...rest } = cfg;
      const regularizer = typeof l2 === 'number' && l2 > 0 ? tf.regularizers.l2({ l2 }) : undefined;
      return tf.layers.conv2d({
        activation: activation || 'relu',
        padding: padding || 'same',
        strides: Array.isArray(strides) ? strides : [strides || 1, strides || 1],
        kernelRegularizer: regularizer,
        ...rest,
      });
    }
    case 'conv1d': {
      const { activation, padding, strides, ...rest } = cfg;
      return tf.layers.conv1d({
        activation: activation || 'relu',
        padding: padding || 'same',
        strides: strides || 1,
        ...rest,
      });
    }
    case 'maxPooling2d': {
      const { poolSize, strides } = cfg;
      return tf.layers.maxPooling2d({
        poolSize: Array.isArray(poolSize) ? poolSize : [poolSize || 2, poolSize || 2],
        strides: Array.isArray(strides) ? strides : [strides || 2, strides || 2],
      });
    }
    case 'flatten':
      return tf.layers.flatten({});
    case 'dense': {
      const { activation, units, dropout, l2, ...rest } = cfg;
      const regularizer = typeof l2 === 'number' && l2 > 0 ? tf.regularizers.l2({ l2 }) : undefined;
      return tf.layers.dense({ activation: activation || 'relu', units: units || 64, kernelRegularizer: regularizer, ...rest });
    }
    case 'embedding':
      return tf.layers.embedding({ maskZero: false, ...cfg });
    case 'lstm':
      return tf.layers.lstm({ ...cfg });
    case 'bidirectional': {
      const { l2, ...rest } = cfg;
      const base = tf.layers.lstm(rest);
      if (typeof l2 === 'number' && l2 > 0) {
        const regularized = tf.layers.lstm({ ...rest, kernelRegularizer: tf.regularizers.l2({ l2 }) });
        return tf.layers.bidirectional({ layer: regularized });
      }
      return tf.layers.bidirectional({ layer: base });
    }
    case 'gru':
      return tf.layers.gru(cfg);
    case 'dropout':
      return tf.layers.dropout({ rate: cfg.rate || 0.25 });
    case 'batchNorm':
      return tf.layers.batchNormalization({ momentum: cfg.momentum || 0.99, epsilon: cfg.epsilon || 0.001 });
    case 'attention':
      return tf.layers.multiHeadAttention({ numHeads: cfg.numHeads || 4, keyDim: cfg.keyDim || 16 });
    default:
      return tf.layers.dense({ units: cfg.units || 64, activation: cfg.activation || 'relu' });
  }
}

export function buildOptimizer(tf: any, name: string, lr: number) {
  switch (name) {
    case 'sgd': return tf.train.sgd(lr);
    case 'rmsprop': return tf.train.rmsprop(lr);
    case 'adam': default: return tf.train.adam(lr);
  }
}

export function buildLoss(tf: any, name: string): string {
  switch (name) {
    case 'meanSquaredError': return 'meanSquaredError';
    case 'binaryCrossentropy': return 'binaryCrossentropy';
    case 'sparseCategoricalCrossentropy': return 'categoricalCrossentropy';
    case 'meanAbsoluteError': return 'meanAbsoluteError';
    case 'quantileLoss': return 'meanAbsoluteError';
    case 'categoricalCrossentropy': default: return 'categoricalCrossentropy';
  }
}

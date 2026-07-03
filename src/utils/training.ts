import { createRandom } from './random';
import { getTf } from './model';

export async function generateSyntheticTensor(shape: number[], seed: number, min = 0, max = 1): Promise<any> {
  const t = await getTf();
  const total = shape.reduce((a, b) => a * b, 1);
  const rng = createRandom(seed);
  const values = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    values[i] = min + rng() * (max - min);
  }
  return t.tensor(values, shape);
}

export async function generateSyntheticBatch(
  inputShape: number[],
  classCount: number,
  batchSize: number,
  seed: number,
  task: 'classification' | 'regression' | 'sequence' = 'classification'
): Promise<{ xs: any; ys?: any }> {
  const t = await getTf();
  const baseSeed = seed * 1000;
  const xsShape = [batchSize, ...inputShape];
  const xs = await generateSyntheticTensor(xsShape, baseSeed, 0, 1);
  const labels = Array.from({ length: batchSize }, (_, i) => i % classCount);
  const ys = t.oneHot(t.tensor1d(labels, 'int32'), classCount);
  return { xs, ys };
}

export async function generateSyntheticTextBatch(
  vocabSize: number,
  seqLen: number,
  classCount: number,
  batchSize: number,
  seed: number
): Promise<{ xs: any; ys: any }> {
  const t = await getTf();
  const rng = createRandom(seed);
  const xs = t.tensor2d(
    Array.from({ length: batchSize }, () =>
      Array.from({ length: seqLen }, () => Math.floor(rng() * vocabSize))
    ),
    [batchSize, seqLen]
  );
  const labels = Array.from({ length: batchSize }, (_, i) => i % classCount);
  const ys = t.oneHot(t.tensor1d(labels, 'int32'), classCount);
  return { xs, ys };
}

export async function generateSyntheticTimeSeriesBatch(
  inputLen: number,
  forecastLen: number,
  batchSize: number,
  seed: number
): Promise<{ xs: any; ys: any }> {
  const t = await getTf();
  const rng = createRandom(seed);
  const xsValues = new Float32Array(batchSize * inputLen);
  const ysValues = new Float32Array(batchSize * forecastLen);
  for (let b = 0; b < batchSize; b++) {
    for (let i = 0; i < inputLen; i++) xsValues[b * inputLen + i] = rng() * 100 + 50;
    for (let i = 0; i < forecastLen; i++) ysValues[b * forecastLen + i] = rng() * 100 + 50;
  }
  const xs = t.tensor(xsValues, [batchSize, inputLen, 1]);
  const ys = t.tensor(ysValues, [batchSize, forecastLen, 1]);
  return { xs, ys };
}

export async function saveModel(model: any, projectId: string): Promise<void> {
  const t = await getTf();
  try {
    await model.save(`indexeddb://xmachine-model-${projectId}`);
  } catch (e) {
    console.warn('Failed to save model:', e);
  }
}

export async function loadModel(projectId: string): Promise<any> {
  const t = await getTf();
  try {
    const model = await t.loadLayersModel(`indexeddb://xmachine-model-${projectId}`);
    return model;
  } catch (e) {
    return null;
  }
}

export async function deleteModel(projectId: string): Promise<void> {
  const t = await getTf();
  try {
    await t.io.removeModel(`indexeddb://xmachine-model-${projectId}`);
  } catch (e) {
    // ignore
  }
}

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

  // If CV image input: generate class-conditional spatial patterns (Best Practice)
  if (inputShape.length === 3) {
    const [height, width, channels] = inputShape;
    const targetSize = height * width * channels;
    const total = batchSize * targetSize;
    const values = new Float32Array(total);
    const labels: number[] = [];
    const rng = createRandom(baseSeed);

    for (let b = 0; b < batchSize; b++) {
      const label = b % classCount;
      labels.push(label);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let isPattern = false;
          if (label === 0) {
            // Square in center
            isPattern = (y >= height * 0.3 && y <= height * 0.7 && x >= width * 0.3 && x <= width * 0.7);
          } else if (label === 1) {
            // Cross in center
            isPattern = (Math.abs(y - height / 2) < height * 0.08) || (Math.abs(x - width / 2) < width * 0.08);
          } else if (label === 2) {
            // Diagonal line
            isPattern = Math.abs((y / height) - (x / width)) < 0.08;
          } else {
            // Border outline
            isPattern = (y < height * 0.1 || y > height * 0.9 || x < width * 0.1 || x > width * 0.9);
          }

          for (let c = 0; c < channels; c++) {
            const idx = b * targetSize + (y * width + x) * channels + c;
            values[idx] = isPattern ? (0.75 + rng() * 0.25) : (rng() * 0.25);
          }
        }
      }
    }

    const xs = t.tensor(values, xsShape);
    const ys = t.oneHot(t.tensor1d(labels, 'int32'), classCount);
    return { xs, ys };
  }

  // Fallback for non-CV inputs
  const xs = await generateSyntheticTensor(xsShape, baseSeed, 0, 1);
  const labels = deriveLabelsFromInput(xs, classCount);
  const ys = t.oneHot(t.tensor1d(labels, 'int32'), classCount);
  return { xs, ys };
}

function deriveLabelsFromInput(xs: any, classCount: number): number[] {
  const values = Array.from((xs.dataSync?.() as ArrayLike<number>) ?? []);
  const dims: number[] = Array.isArray(xs.shape) ? xs.shape : [];
  const perSample = dims.length > 1 ? dims.slice(1).reduce((a: number, b: number) => a * b, 1) : 1;
  const labels: number[] = [];
  for (let i = 0; i < (dims[0] ?? values.length / (perSample || 1)); i++) {
    let sum = 0;
    for (let j = 0; j < perSample; j++) {
      sum += values[i * perSample + j] || 0;
    }
    labels.push(Math.floor(Math.abs(sum)) % classCount);
  }
  return labels;
}

export async function generateSyntheticTextBatch(
  vocabSize: number,
  seqLen: number,
  classCount: number,
  batchSize: number,
  seed: number,
  isLLM?: boolean
): Promise<{ xs: any; ys: any }> {
  const t = await getTf();
  const rng = createRandom(seed);
  const tokens = Array.from({ length: batchSize }, () =>
    Array.from({ length: seqLen + 1 }, () => Math.floor(rng() * vocabSize))
  );

  if (isLLM) {
    const xs = t.tensor2d(tokens.map(row => row.slice(0, seqLen)), [batchSize, seqLen]);
    const nextTokens = tokens.map(row => {
      const seq = row.slice(0, seqLen);
      const next = row[seqLen] ?? 0;
      return [next];
    });
    const ys = t.oneHot(t.tensor1d(nextTokens.flat(), 'int32'), vocabSize);
    return { xs, ys };
  }

  const xs = t.tensor2d(tokens.map(row => row.slice(0, seqLen)), [batchSize, seqLen]);
  const labels = deriveLabelsFromInput(xs, classCount);
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

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  if (!base64 || typeof base64 !== 'string' || base64.trim().startsWith('{')) {
    return new ArrayBuffer(0);
  }
  const cleanBase64 = base64.trim();
  if (typeof window === 'undefined') {
    const buf = Buffer.from(cleanBase64, 'base64');
    // Buffer.buffer is a raw ArrayBuffer that might be larger than the view due to pooling.
    // To ensure exact size and alignment, slice the buffer correctly:
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }
  const binaryString = atob(cleanBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function loadModel(projectId: string, epoch?: number | 'latest'): Promise<any> {
  const t = await getTf();
  
  if (typeof window !== 'undefined' && (!epoch || epoch === 'latest')) {
    try {
      const model = await t.loadLayersModel(`indexeddb://xmachine-model-${projectId}`);
      if (model) return model;
    } catch (e) {
      // ignore
    }
  }

  try {
    let project = null;
    if (typeof window === 'undefined') {
      const { dbConnect } = await import('./db');
      const StudioWorkspaceProject = await import('../models/Project').then(m => m.default);
      await dbConnect();
      project = await StudioWorkspaceProject.findById(projectId);
    } else {
      const res = await fetch(`/api/projects?id=${projectId}`);
      const json = await res.json();
      project = json?.data;
    }

    if (!project) {
      console.warn(`[loadModel] Project document not found in database for ID: ${projectId}`);
      return null;
    }

    let artifact = null;
    if (epoch && epoch !== 'latest') {
      const checkpoint = project.checkpoints?.find((cp: any) => cp.epoch === Number(epoch));
      artifact = checkpoint?.modelArtifact;
    } else {
      artifact = project.modelArtifact;
    }

    if (!artifact || !artifact.topology || !artifact.weightData) {
      const sortedCheckpoints = [...(project.checkpoints || [])]
        .filter((cp: any) => cp.modelArtifact?.topology && cp.modelArtifact?.weightData)
        .sort((a: any, b: any) => b.epoch - a.epoch);
      if (sortedCheckpoints.length > 0) {
        artifact = sortedCheckpoints[0].modelArtifact;
      }
    }

    if (!artifact) {
      console.warn(`[loadModel] No model checkpoint artifact found for project ID: ${projectId}`);
      return null;
    }

    if (!artifact.topology || !artifact.weightData) {
      console.warn(`[loadModel] Artifact found, but topology or weightData is missing for project ID: ${projectId}`, {
        hasTopology: !!artifact.topology,
        hasWeightData: !!artifact.weightData
      });
      return null;
    }

    const modelTopology = typeof artifact.topology === 'string'
      ? JSON.parse(artifact.topology)
      : artifact.topology;

    const weightSpecs = typeof artifact.weightSpecs === 'string'
      ? JSON.parse(artifact.weightSpecs)
      : Array.isArray(artifact.weightSpecs)
        ? artifact.weightSpecs
        : [];

    try {
      const model = await t.loadLayersModel(
        t.io.fromMemory({
          modelTopology,
          weightSpecs,
          weightData: base64ToArrayBuffer(artifact.weightData),
        })
      );
      return model;
    } catch (error) {
      console.error('[loadModel] loadLayersModel execution failed:', error);
      console.log('[loadModel] Artifact details:', {
        topologyKeys: modelTopology ? Object.keys(modelTopology) : null,
        specsCount: weightSpecs?.length,
        weightDataLength: artifact.weightData?.length
      });
      return null;
    }
  } catch (error) {
    console.error('[loadModel] Database query or fetch failed:', error);
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

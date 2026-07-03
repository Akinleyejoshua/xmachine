/**
 * Local inference utilities for the ML platform.
 *
 * Loads a trained TF.js model saved by TrainingMonitor and runs inference
 * against the real model when available.
 */

import { loadModel } from './training';

const MODEL_CACHE = new Map<string, unknown>();

export async function generateLocalResponse(prompt: string, projectId: string): Promise<string> {
  const trimmed = prompt.trim();
  if (!trimmed) {
    return 'Please enter a prompt to generate a response.';
  }

  try {
    const model = (await loadProjectModel(projectId)) as any;
    if (model && typeof model.predict === 'function') {
      const tokens = trimmed.split(/\s+/).map(w => Math.abs(w.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 5000);
      const seqLen = 100;
      while (tokens.length < seqLen) tokens.push(0);
      const { getTf } = await import('./model');
      const t = await getTf();
      const inputTensor = t.tensor2d([tokens.slice(0, seqLen)], [1, seqLen]);
      const prediction = model.predict(inputTensor);
      const scores = await prediction.data() as Float32Array;
      inputTensor.dispose();
      prediction.dispose();
      const best = [...Array.from(scores)].indexOf(Math.max(...Array.from(scores)));
      return `Model output: class=${best}, probabilities=[${Array.from(scores).map(v => v.toFixed(4)).join(', ')}]`;
    }
  } catch (error) {
    console.error('Model inference failed:', error);
  }

  return 'No trained model is available yet. Complete training first, then run inference.';
}

async function loadProjectModel(projectId: string): Promise<unknown> {
  const cached = MODEL_CACHE.get(projectId);
  if (cached) return cached;

  try {
    const model = await loadModel(projectId);
    if (model) {
      MODEL_CACHE.set(projectId, model);
      return model;
    }
  } catch (error) {
    console.warn('IndexedDB model load failed, trying database:', error);
  }

  try {
    const res = await fetch(`/api/projects/${projectId}`);
    const json = await res.json();
    const project = json?.data;
    const artifact = project?.modelArtifact as Record<string, unknown> | undefined;
    if (!artifact?.topology || !artifact?.weightData) {
      return null;
    }

    const { getTf } = await import('./model');
    const t = await getTf();
    const model = await t.loadLayersModel(
      t.io.fromMemory({
        modelTopology: artifact.topology,
        weightSpecs: Array.isArray(artifact.weightSpecs) ? artifact.weightSpecs : [],
        weightData: artifact.weightData,
      })
    );

    MODEL_CACHE.set(projectId, model);
    return model;
  } catch (error) {
    console.warn('Failed to load trained model for project from database:', error);
    return null;
  }
}

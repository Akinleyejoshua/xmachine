import { getTf } from './model';

export async function saveModel(model: any, projectId: string): Promise<void> {
  const t = await getTf();
  try {
    await model.save(`indexeddb://xmachine-model-${projectId}`);
  } catch (e) {
    console.warn('Failed to save model:', e);
  }
}

export async function loadModel(projectId: string, _epoch?: number | 'latest'): Promise<any> {
  const t = await getTf();
  if (typeof window !== 'undefined') {
    try {
      const model = await t.loadLayersModel(`indexeddb://xmachine-model-${projectId}`);
      if (model) return model;
    } catch (e) {
      console.warn(`[loadModel] No model in IndexedDB for ${projectId}:`, e);
    }
  }
  return null;
}

export async function deleteModel(projectId: string): Promise<void> {
  const t = await getTf();
  try {
    await t.io.removeModel(`indexeddb://xmachine-model-${projectId}`);
  } catch (e) {
    // ignore
  }
}
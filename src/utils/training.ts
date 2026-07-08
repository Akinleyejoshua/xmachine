import { getTf } from './model';

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

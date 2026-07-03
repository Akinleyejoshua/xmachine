import { NextResponse } from 'next/server';
import { dbConnect } from '../../../utils/db';
import StudioWorkspaceProject from '../../../models/Project';

export async function POST(request: Request) {
  try {
    await dbConnect();
    const { projectId, epoch, fileSize, metrics, modelArtifact } = await request.json();

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'Project ID is required' }, { status: 400 });
    }

    const checkpoint = {
      epoch,
      timestamp: new Date().toLocaleTimeString(),
      fileSize: fileSize || 102400,
      checkpointUrl: `/api/checkpoints/download?projectId=${projectId}&epoch=${epoch}`,
      modelArtifact: modelArtifact ? {
        ...modelArtifact,
        savedAt: new Date().toISOString(),
      } : undefined
    };

    const updatePayload: Record<string, unknown> = {
      $push: { checkpoints: checkpoint },
      ...(metrics ? { $push: { metricsHistory: { epoch, ...metrics } } } : {}),
    };

    if (modelArtifact) {
      updatePayload.$set = {
        modelArtifact: {
          ...modelArtifact,
          savedAt: new Date().toISOString(),
        },
        latestModelCheckpointEpoch: epoch,
      };
    }

    const updatedProject = await StudioWorkspaceProject.findByIdAndUpdate(
      projectId,
      updatePayload,
      { new: true }
    );

    if (!updatedProject) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: checkpoint });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

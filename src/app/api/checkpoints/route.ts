import { NextResponse } from 'next/server';
import { dbConnect } from '../../../utils/db';
import StudioWorkspaceProject from '../../../models/Project';

export async function POST(request: Request) {
  try {
    await dbConnect();
    const { projectId, epoch, fileSize } = await request.json();

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'Project ID is required' }, { status: 400 });
    }

    const checkpoint = {
      epoch,
      timestamp: new Date().toLocaleTimeString(),
      fileSize: fileSize || 102400,
      checkpointUrl: `/api/checkpoints/download?projectId=${projectId}&epoch=${epoch}`,
    };

    const updatedProject = await StudioWorkspaceProject.findByIdAndUpdate(
      projectId,
      { $push: { checkpoints: checkpoint } },
      { new: true }
    );

    if (!updatedProject) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: checkpoint });
  } catch (error: any) {
    console.error('Checkpoint save error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
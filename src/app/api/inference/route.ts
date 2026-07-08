import { NextResponse } from 'next/server';
import { runServerInference } from '../../../utils/inference';
import { dbConnect } from '../../../utils/db';
import StudioWorkspaceProject from '../../../models/Project';

export async function POST(request: Request) {
  try {
    const { prompt, projectId, domain, epoch } = await request.json();
    if (!prompt) {
      return NextResponse.json({ success: false, error: 'Prompt is required' }, { status: 400 });
    }
    if (!projectId) {
      return NextResponse.json({ success: false, error: 'Project ID is required' }, { status: 400 });
    }
    if (!domain) {
      return NextResponse.json({ success: false, error: 'Domain is required' }, { status: 400 });
    }

    await dbConnect();
    let project = null;
    try {
      project = await StudioWorkspaceProject.findById(projectId);
    } catch (e) {
      console.warn('Failed to load project from database:', e);
    }

    const classNames = project?.etl?.classNames && project.etl.classNames.length > 0
      ? project.etl.classNames
      : [];

    const realResult = await runServerInference(prompt, projectId, domain, classNames, epoch);
    if (realResult) {
      return NextResponse.json({ success: true, data: realResult });
    }

    return NextResponse.json({ success: false, error: 'Model inference failed — no trained model found.' }, { status: 500 });
  } catch (error: any) {
    console.error('Inference error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
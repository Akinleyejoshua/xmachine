import { NextResponse } from 'next/server';
import { dbConnect } from '../../../utils/db';
import StudioWorkspaceProject from '../../../models/Project';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const project: any = await StudioWorkspaceProject.findById(id).lean();
      if (!project) {
        return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
      }
      // Strip rawContent from files to keep response small
      if (project.etl?.files) {
        project.etl.files = project.etl.files.map((f: any) => {
          const { rawContent, ...meta } = f;
          return meta;
        });
      }
      return NextResponse.json({ success: true, data: project });
    }

    // Lightweight listing — only metadata, no ETL/files/model data
    const projects = await StudioWorkspaceProject.find({}, {
      name: 1, domain: 1, createdAt: 1, updatedAt: 1, 'etl.classNames': 1, 'etl.batchSize': 1,
      'modelConfig.hyperparameters': 1
    }).sort({ updatedAt: -1 }).lean() as any[];
    return NextResponse.json({ success: true, data: projects });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    
    // Strip rawContent from files before saving to MongoDB
    if (body.etl?.files) {
      body.etl.files = body.etl.files.map((f: any) => {
        const { rawContent, ...meta } = f;
        return meta;
      });
    }
    
    let project;
    if (body.id || body._id) {
      const id = body.id || body._id;
      project = await StudioWorkspaceProject.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    }

    if (!project) {
      project = await StudioWorkspaceProject.create(body);
    }

    return NextResponse.json({ success: true, data: project });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Project ID is required' }, { status: 400 });
    }

    const deletedProject = await StudioWorkspaceProject.findByIdAndDelete(id);

    if (!deletedProject) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: deletedProject });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

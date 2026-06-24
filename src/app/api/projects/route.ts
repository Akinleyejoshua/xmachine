import { NextResponse } from 'next/server';
import { dbConnect } from '../../../utils/db';
import StudioWorkspaceProject from '../../../models/Project';

export async function GET() {
  try {
    await dbConnect();
    const projects = await StudioWorkspaceProject.find({}).sort({ updatedAt: -1 });
    return NextResponse.json({ success: true, data: projects });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    
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

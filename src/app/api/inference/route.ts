import { NextResponse } from 'next/server';
import { generateLocalResponse } from '../../../utils/inference';
import { DOMAIN_CONFIGS } from '../../../config/domain/registry';

export async function POST(request: Request) {
  try {
    const { prompt, projectId, domain } = await request.json();
    if (!prompt) {
      return NextResponse.json({ success: false, error: 'Prompt is required' }, { status: 400 });
    }
    if (!projectId) {
      return NextResponse.json({ success: false, error: 'Project ID is required' }, { status: 400 });
    }
    if (!domain) {
      return NextResponse.json({ success: false, error: 'Domain is required' }, { status: 400 });
    }

    // Handle LLM domain specifically with local inference
    if (domain === 'llm-finetuning') {
      const generatedText = await generateLocalResponse(prompt, projectId);
      return NextResponse.json({ success: true, data: { text: generatedText } });
    }

    // Handle other domains using registry mock results
    const domainConfig = DOMAIN_CONFIGS[domain as keyof typeof DOMAIN_CONFIGS];
    if (domainConfig?.sandbox?.defaultMockResult) {
      const result = domainConfig.sandbox.defaultMockResult(prompt, domainConfig.pipeline.defaultClassNames || []);
      return NextResponse.json({ success: true, data: result });
    }

    // Fallback for unknown domains
    return NextResponse.json({ success: true, data: `Inference result for domain: ${domain}.` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
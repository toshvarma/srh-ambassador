import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl;
    const secret = searchParams.get('secret');
    const slug = searchParams.get('slug');
    const status = searchParams.get('status');

    // Validate secret
    if (secret !== process.env.PREVIEW_SECRET) {
        return new Response('Invalid preview secret', { status: 401 });
    }

    const draft = await draftMode();

    if (status === 'draft') {
        draft.enable();
    } else {
        draft.disable();
    }

    // Redirect to the relevant page
    redirect(slug ? `/news/${slug}` : '/');
}
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase-server';
import { isMockMode } from '@/lib/mock';

// ─────────────────────────────────────────────────────────────
//  POST /admin/api/upload
//
//  multipart/form-data with one file. Stores under
//  bucket 'mamali-images' with a random filename. Returns the
//  public URL.
//
//  Bucket must be created in Supabase dashboard first:
//    Storage → New bucket → name: 'mamali-images', public: true
// ─────────────────────────────────────────────────────────────

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export const runtime = 'nodejs';

export async function POST(request: Request) {
  await requireAdmin();
  if (isMockMode()) {
    return NextResponse.json({ url: 'mock://uploaded-image' });
  }

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `File too large (max ${MAX_BYTES / 1024 / 1024}MB).` }, { status: 413 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: `Unsupported type ${file.type}. Allowed: JPEG, PNG, WebP, GIF.` }, { status: 415 });
  }

  const ext =
    file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'gif';
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const supabase = createAdminClient();
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from('mamali-images').upload(name, buf, {
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    console.error('Storage upload failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: pub } = supabase.storage.from('mamali-images').getPublicUrl(name);
  return NextResponse.json({ url: pub.publicUrl });
}

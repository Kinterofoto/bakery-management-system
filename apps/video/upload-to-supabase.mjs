import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://khwcknapjnhpxfodsahb.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY env var');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  const BUCKET = 'videos';

  // Create bucket if it doesn't exist (public for easy sharing)
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some(b => b.name === BUCKET);

  if (!exists) {
    const { error } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      allowedMimeTypes: ['video/mp4', 'video/webm'],
      fileSizeLimit: 52428800, // 50MB
    });
    if (error) {
      console.error('Error creating bucket:', error.message);
      process.exit(1);
    }
    console.log('Bucket "videos" created');
  } else {
    console.log('Bucket "videos" already exists');
  }

  // Upload video
  const file = readFileSync('out/supplier-tutorial.mp4');
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload('tutorials/portal-proveedor.mp4', file, {
      contentType: 'video/mp4',
      upsert: true,
    });

  if (error) {
    console.error('Upload error:', error.message);
    process.exit(1);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl('tutorials/portal-proveedor.mp4');

  console.log('Video uploaded successfully!');
  console.log('Public URL:', urlData.publicUrl);
}

main();

import { NextRequest, NextResponse } from 'next/server';

const PINATA_JWT = process.env.PINATA_JWT;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    if (!PINATA_JWT) {
      return NextResponse.json(
        { error: 'Pinata JWT not configured. Please set PINATA_JWT in your environment variables.' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds the limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB. Please select a smaller file.` },
        { status: 400 }
      );
    }

    const pinataFormData = new FormData();
    pinataFormData.append('file', file);
    
    const metadata = JSON.stringify({
      name: file.name,
    });
    pinataFormData.append('pinataMetadata', metadata);

    const options = JSON.stringify({
      cidVersion: 1,
    });
    pinataFormData.append('pinataOptions', options);

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: pinataFormData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error?.message || `Failed to upload: ${response.statusText}` },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json({ cid: result.IpfsHash });
  } catch (error) {
    console.error('Error uploading to Pinata:', error);
    return NextResponse.json(
      { error: `Failed to upload file to Pinata: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}


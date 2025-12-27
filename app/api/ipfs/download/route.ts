import { NextRequest, NextResponse } from 'next/server';

const PINATA_JWT = process.env.PINATA_JWT;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const cid = searchParams.get('cid');
    const filename = searchParams.get('filename') || cid;

    if (!cid) {
      return NextResponse.json(
        { error: 'CID parameter is required' },
        { status: 400 }
      );
    }

    const gateway = PINATA_JWT
      ? `https://gateway.pinata.cloud/ipfs/${cid}`
      : `https://ipfs.io/ipfs/${cid}`;

    const response = await fetch(gateway);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to download file: ${response.statusText}` },
        { status: response.status }
      );
    }

    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': blob.type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename || 'download')}"`,
      },
    });
  } catch (error) {
    console.error('Error downloading from IPFS:', error);
    return NextResponse.json(
      { error: `Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';

const PINATA_JWT = process.env.PINATA_JWT;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const cid = searchParams.get('cid');

    if (!cid) {
      return NextResponse.json(
        { error: 'CID parameter is required' },
        { status: 400 }
      );
    }

    const gateway = PINATA_JWT
      ? `https://gateway.pinata.cloud/ipfs/${cid}`
      : `https://ipfs.io/ipfs/${cid}`;

    return NextResponse.json({ gateway });
  } catch (error) {
    console.error('Error getting gateway URL:', error);
    return NextResponse.json(
      { error: `Failed to get gateway URL: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}


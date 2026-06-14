import { NextRequest, NextResponse } from 'next/server';
import { getClientById } from '@/lib/db/queries/oauth_clients';

// GET /api/oauth/clients/:clientId - Get public client information
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;

    if (!clientId) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Client ID is required' },
        { status: 400 }
      );
    }

    const client = await getClientById(clientId);

    if (!client) {
      return NextResponse.json(
        { error: 'client_not_found', error_description: 'OAuth client not found' },
        { status: 404 }
      );
    }

    // Return only public client information (NOT the secret!)
    return NextResponse.json({
      client_id: client.client_id,
      name: client.name,
      logo_url: client.logo_url,
    });
  } catch (error) {
    console.error('Get client info error:', error);
    return NextResponse.json(
      { error: 'server_error', error_description: 'Internal server error' },
      { status: 500 }
    );
  }
}

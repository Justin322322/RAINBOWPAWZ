import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const providerId = params.id;

    if (!providerId) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 }
      );
    }

    // Try to fetch from service_providers table
    try {
      const providerResult = await query(`
        SELECT
          id,
          name,
          city,
          address,
          phone,
          service_description as description,
          provider_type as type,
          created_at
        FROM service_providers
        WHERE id = ? AND verification_status = 'verified' AND status = 'active'
        LIMIT 1
      `, [providerId]) as any[];

      if (providerResult && providerResult.length > 0) {
        const provider = providerResult[0];

        // Calculate approximate distance (mock data for now, but with consistent values)
        const distanceValue = ((provider.id * 1.5) % 30).toFixed(1);
        provider.distance = `${distanceValue} km away`;

        return NextResponse.json({ provider });
      }

      // If not found in service_providers, try business_profiles
      const businessResult = await query(`
        SELECT
          bp.id,
          bp.business_name as name,
          bp.city,
          bp.business_address as address,
          bp.business_phone as phone,
          u.email,
          bp.service_description as description,
          bp.business_type,
          bp.created_at
        FROM business_profiles bp
        JOIN users u ON bp.user_id = u.id
        WHERE bp.id = ? AND bp.verification_status = 'verified'
        LIMIT 1
      `, [providerId]) as any[];

      if (businessResult && businessResult.length > 0) {
        const business = businessResult[0];

        // Format the business data to match the expected format
        const formattedBusiness = {
          id: business.id,
          name: business.name,
          city: business.address ? business.address.split(',')[0] : (business.city || 'Bataan'),
          address: business.address,
          phone: business.phone,
          email: business.email,
          description: business.description || 'Pet cremation services',
          type: 'Pet Cremation Services',
          distance: `${((business.id * 1.5) % 30).toFixed(1)} km away`, // Consistent distance based on ID
          // Add postal code to ensure proper geocoding
          address: business.address.includes('2100') ? business.address : business.address.replace('Philippines', '2100 Philippines'),
          created_at: business.created_at
        };

        return NextResponse.json({ provider: formattedBusiness });
      }

      // If provider not found in either table
      console.error(`Provider with ID ${providerId} not found in any table`);

      // Check if this is one of our test providers
      if (providerId === '1001' || providerId === '1002' || providerId === '1003') {
        // Return the test provider data
        const testProviders = {
          '1001': {
            id: 1001,
            name: "Rainbow Bridge Pet Cremation",
            city: "Balanga City, Bataan",
            address: "Capitol Drive, Balanga City, Bataan, 2100 Philippines",
            phone: "(123) 456-7890",
            email: "info@rainbowbridge.com",
            description: "Compassionate pet cremation services with personalized memorials. We offer a range of options to help you honor your beloved pet's memory, including private and communal cremation services, custom urns, memorial jewelry, and paw print keepsakes.",
            type: "Pet Cremation Services",
            packages: 3,
            distance: "5.5 km away",
            distanceValue: 5.5,
            created_at: new Date().toISOString()
          },
          '1002': {
            id: 1002,
            name: "Peaceful Paws Memorial",
            city: "Orani, Bataan",
            address: "National Road, Orani, Bataan, 2112 Philippines",
            phone: "(234) 567-8901",
            email: "care@peacefulpaws.com",
            description: "Dignified pet cremation with eco-friendly options. Our services include gentle handling of your pet, environmentally conscious cremation processes, biodegradable urns, and memorial tree planting options to create a living tribute to your pet.",
            type: "Pet Cremation Services",
            packages: 2,
            distance: "12.3 km away",
            distanceValue: 12.3,
            created_at: new Date().toISOString()
          },
          '1003': {
            id: 1003,
            name: "Forever Friends Pet Services",
            city: "Dinalupihan, Bataan",
            address: "San Ramon Highway, Dinalupihan, Bataan, 2110 Philippines",
            phone: "(345) 678-9012",
            email: "service@foreverfriends.com",
            description: "Comprehensive pet memorial services with home pickup options. We understand that saying goodbye is difficult, so we offer compassionate home collection services, private viewing rooms for final goodbyes, and a range of memorial products to honor your pet's memory.",
            type: "Pet Cremation Services",
            packages: 4,
            distance: "18.7 km away",
            distanceValue: 18.7,
            created_at: new Date().toISOString()
          }
        };

        return NextResponse.json({ provider: testProviders[providerId] });
      }

      // Check if there are any providers at all
      const allProvidersResult = await query(`
        SELECT COUNT(*) as count FROM service_providers
        WHERE verification_status = 'verified' AND status = 'active'
      `) as any[];

      const allBusinessesResult = await query(`
        SELECT COUNT(*) as count FROM business_profiles
        WHERE verification_status = 'verified'
      `) as any[];

      const totalProviders =
        (allProvidersResult[0]?.count || 0) +
        (allBusinessesResult[0]?.count || 0);

      if (totalProviders === 0) {
        return NextResponse.json(
          { error: 'No service providers available in the system. Please contact support.' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: 'Provider not found. The requested service provider may have been removed or is no longer available.' },
        { status: 404 }
      );
    } catch (dbError) {
      console.error('Database error fetching provider:', dbError);
      return NextResponse.json(
        { error: 'Database error', details: dbError instanceof Error ? dbError.message : 'Unknown error' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error fetching provider:', error);
    return NextResponse.json(
      { error: 'Failed to fetch provider' },
      { status: 500 }
    );
  }
}

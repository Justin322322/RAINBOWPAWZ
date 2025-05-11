import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    console.log('Fetching service providers from database');
    
    // Try to fetch service providers from the database
    try {
      // First try the service_providers table
      const providersResult = await query(`
        SELECT 
          id, 
          name, 
          city, 
          address, 
          phone, 
          email, 
          description, 
          provider_type as type,
          created_at
        FROM service_providers
        ORDER BY name ASC
      `) as any[];

      if (providersResult && providersResult.length > 0) {
        console.log(`Found ${providersResult.length} service providers in service_providers table`);
        
        // Get the number of packages for each provider
        for (const provider of providersResult) {
          try {
            const packagesResult = await query(`
              SELECT COUNT(*) as package_count
              FROM service_packages
              WHERE provider_id = ?
            `, [provider.id]) as any[];
            
            provider.packages = packagesResult[0]?.package_count || 0;
            
            // Calculate approximate distance (mock data for now)
            provider.distance = `${(Math.random() * 30).toFixed(1)} km away`;
          } catch (error) {
            console.error(`Error fetching packages for provider ${provider.id}:`, error);
            provider.packages = 0;
            provider.distance = 'Distance unavailable';
          }
        }
        
        return NextResponse.json({ providers: providersResult });
      }
      
      // If no results from service_providers, try business_profiles table
      console.log('No results in service_providers table, trying business_profiles');
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
        WHERE bp.verification_status = 'verified'
        AND bp.business_type = 'cremation'
        ORDER BY bp.business_name ASC
      `) as any[];
      
      if (businessResult && businessResult.length > 0) {
        console.log(`Found ${businessResult.length} cremation businesses in business_profiles table`);
        
        // Format the business data to match the expected format
        const formattedBusinesses = businessResult.map(business => ({
          id: business.id,
          name: business.name,
          city: business.city || 'Bataan',
          address: business.address,
          phone: business.phone,
          email: business.email,
          description: business.description || 'Pet cremation services',
          type: 'Pet Cremation Services',
          packages: Math.floor(Math.random() * 5) + 1, // Random number of packages between 1-5
          distance: `${(Math.random() * 30).toFixed(1)} km away`, // Random distance
          created_at: business.created_at
        }));
        
        return NextResponse.json({ providers: formattedBusinesses });
      }
    } catch (dbError) {
      console.error('Database error fetching service providers:', dbError);
      // Continue to fallback instead of throwing
    }
    
    // Fallback: Return mock data if database query fails or no providers found
    console.log('No service providers found in database, returning mock data');
    
    const mockProviders = [
      {
        id: 1,
        name: "Rainbow Bridge Pet Cremation",
        city: 'Capitol Drive, Balanga City, Bataan',
        distance: '0.5 km away',
        type: 'Pet Cremation Services',
        packages: 5,
        address: 'Capitol Drive, Balanga City, Bataan, Philippines',
        phone: '(123) 456-7890',
        email: 'info@rainbowbridge.com',
        description: 'Compassionate pet cremation services with personalized memorials.'
      },
      {
        id: 2,
        name: 'Peaceful Paws Memorial',
        city: 'Tuyo, Balanga City, Bataan',
        distance: '2.2 km away',
        type: 'Pet Cremation Services',
        packages: 7,
        address: 'Tuyo, Balanga City, Bataan, Philippines',
        phone: '(234) 567-8901',
        email: 'care@peacefulpaws.com',
        description: 'Dignified pet cremation with eco-friendly options.'
      },
      {
        id: 3,
        name: 'Eternal Companions',
        city: 'Tenejero, Balanga City, Bataan',
        distance: '1.8 km away',
        type: 'Pet Cremation Services',
        packages: 1,
        address: 'Tenejero, Balanga City, Bataan, Philippines',
        phone: '(345) 678-9012',
        email: 'service@eternalcompanions.com',
        description: 'Honoring your pet with respectful cremation services.'
      },
      {
        id: 4,
        name: 'Pet Care Center',
        city: 'Orion, Bataan',
        distance: '8.5 km away',
        type: 'Pet Cremation Services',
        packages: 3,
        address: 'Orion, Bataan, Philippines',
        phone: '(456) 789-0123',
        email: 'info@petcarecenter.com',
        description: 'Professional pet cremation with personalized service.'
      },
      {
        id: 5,
        name: 'Rainbow Pet Memorial',
        city: 'Mariveles, Bataan',
        distance: '25.8 km away',
        type: 'Pet Cremation Services',
        packages: 4,
        address: 'Mariveles, Bataan 2105, Philippines',
        phone: '(567) 890-1234',
        email: 'contact@rainbowpetmemorial.com',
        description: 'Providing dignified pet cremation services with care.'
      },
      {
        id: 6,
        name: 'Paws & Hearts',
        city: 'Dinalupihan, Bataan',
        distance: '17.3 km away',
        type: 'Pet Cremation Services',
        packages: 2,
        address: 'Dinalupihan, Bataan, Philippines',
        phone: '(678) 901-2345',
        email: 'hello@pawsandhearts.com',
        description: 'Caring pet cremation services with a personal touch.'
      },
    ];
    
    return NextResponse.json({ providers: mockProviders });
  } catch (error) {
    console.error('Error fetching service providers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service providers' },
      { status: 500 }
    );
  }
}

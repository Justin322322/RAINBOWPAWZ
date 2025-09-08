import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').trim();
    const limit = Math.min(Number(url.searchParams.get('limit') || 10), 50);

    console.log('Packages suggestions API called with query:', q, 'limit:', limit);
    
    // Since the suggestion tables don't exist in the consolidated database,
    // we'll provide basic suggestions based on common pet service terms
    const commonInclusions = [
      'Individual cremation',
      'Return of ashes in urn',
      'Certificate of cremation',
      'Transportation service',
      'Safe handling',
      'Respectful process',
      'Memorial keepsake',
      '24/7 support',
      'Professional service',
      'Compassionate care'
    ];

    const commonAddOns = [
      { name: 'Premium urn upgrade', price: 500 },
      { name: 'Memorial photo frame', price: 200 },
      { name: 'Paw print impression', price: 300 },
      { name: 'Memorial jewelry', price: 800 },
      { name: 'Additional certificates', price: 100 },
      { name: 'Express service', price: 1000 },
      { name: 'Weekend service', price: 500 },
      { name: 'Home pickup', price: 300 },
      { name: 'Memorial video', price: 600 },
      { name: 'Custom engraving', price: 400 }
    ];

    // Filter suggestions based on query
    let filteredInclusions = commonInclusions;
    let filteredAddOns = commonAddOns;

    if (q) {
      const queryLower = q.toLowerCase();
      filteredInclusions = commonInclusions.filter(item => 
        item.toLowerCase().includes(queryLower)
      );
      filteredAddOns = commonAddOns.filter(item => 
        item.name.toLowerCase().includes(queryLower)
      );
    }

    // Limit results
    const inclusions = filteredInclusions.slice(0, limit);
    const addOns = filteredAddOns.slice(0, limit);

    return NextResponse.json({
      inclusions,
      addOns
    });
    
  } catch (err: any) {
    console.error('Packages suggestions API error:', err);
    return NextResponse.json({ 
      error: 'Failed to load suggestions', 
      details: err.message 
    }, { status: 500 });
  }
}



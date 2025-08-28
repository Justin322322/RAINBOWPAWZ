// Test script for the new geocoding system
const testAddresses = [
  'Balanga City, Bataan',
  'Samal, Bataan',
  'Abucay, Bataan',
  'Manila, Philippines',
  'Quezon City, Metro Manila',
  'Makati City, Philippines',
  'Brgy. San Jose, Balanga, Bataan',
  'Subd. Villa Angela, Samal, Bataan'
];

async function testGeocoding() {
  console.log('🧪 Testing new geocoding system...\n');
  
  for (const address of testAddresses) {
    try {
      console.log(`📍 Testing: ${address}`);
      
      // Test with our improved API
      const response = await fetch(`http://localhost:3000/api/geocoding?address=${encodeURIComponent(address)}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const bestResult = data[0];
          console.log(`✅ Success: ${bestResult.display_name}`);
          console.log(`   Coordinates: ${bestResult.lat}, ${bestResult.lon}`);
          console.log(`   Provider: ${bestResult.provider}`);
          console.log(`   Confidence: ${bestResult.confidence}`);
          console.log(`   Type: ${bestResult.type}`);
        } else {
          console.log(`❌ No results found`);
        }
      } else {
        const errorData = await response.json();
        console.log(`❌ Error: ${response.status} - ${errorData.error}`);
      }
      
      console.log(''); // Empty line for readability
      
      // Small delay to avoid overwhelming the APIs
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.log(`❌ Exception: ${error.message}`);
      console.log('');
    }
  }
  
  console.log('🏁 Testing completed!');
}

// Test specific providers
async function testSpecificProviders() {
  console.log('🔍 Testing specific providers...\n');
  
  const testAddress = 'Balanga City, Bataan';
  
  const providers = ['photon', 'pelias', 'nominatim'];
  
  for (const provider of providers) {
    try {
      console.log(`📍 Testing ${provider.toUpperCase()} with: ${testAddress}`);
      
      const response = await fetch(`http://localhost:3000/api/geocoding?address=${encodeURIComponent(testAddress)}&provider=${provider}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const result = data[0];
          console.log(`✅ ${provider.toUpperCase()} Success: ${result.display_name}`);
          console.log(`   Coordinates: ${result.lat}, ${result.lon}`);
          console.log(`   Confidence: ${result.confidence}`);
        } else {
          console.log(`❌ ${provider.toUpperCase()}: No results found`);
        }
      } else {
        const errorData = await response.json();
        console.log(`❌ ${provider.toUpperCase()} Error: ${response.status} - ${errorData.error}`);
      }
      
      console.log('');
      
      // Small delay between providers
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.log(`❌ ${provider.toUpperCase()} Exception: ${error.message}`);
      console.log('');
    }
  }
  
  console.log('🏁 Provider testing completed!');
}

// Run tests if this script is executed directly
if (require.main === module) {
  console.log('🚀 Starting geocoding tests...\n');
  
  // Test the main system
  testGeocoding().then(() => {
    console.log('\n' + '='.repeat(50) + '\n');
    // Test specific providers
    return testSpecificProviders();
  }).catch(error => {
    console.error('💥 Test failed:', error);
  });
}

module.exports = { testGeocoding, testSpecificProviders };

import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const packageId = searchParams.get('id') || '1';
    const width = parseInt(searchParams.get('width') || '400');
    const height = parseInt(searchParams.get('height') || '300');
    
    // Create directory for placeholder images if it doesn't exist
    const imagesDir = path.join(process.cwd(), 'public', 'images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }
    
    // Create placeholder image filenames - use SVG instead of JPG
    const placeholderNames = [1, 2, 3, 4, 5].map(num => 
      path.join(imagesDir, `sample-package-${num}.svg`)
    );
    
    // Check if placeholder images already exist
    const allExist = placeholderNames.every(name => fs.existsSync(name));
    
    if (!allExist) {
      // Generate simple SVG placeholders and save them as files
      for (let i = 1; i <= 5; i++) {
        const color = getColorForIndex(i);
        const textColor = getTextColor(color);
        
        // Create a simple SVG placeholder
        const svgContent = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${color}"/>
  <text x="50%" y="50%" font-family="Arial" font-size="24" fill="${textColor}" text-anchor="middle" dominant-baseline="middle">Sample Package ${i}</text>
</svg>`;
        
        // Save the SVG content to the file
        const filePath = path.join(imagesDir, `sample-package-${i}.svg`);
        fs.writeFileSync(filePath, svgContent);
      }
    }
    
    // Create package ID-specific placeholder in the correct folder structure
    const packageDir = path.join(process.cwd(), 'public', 'uploads', 'packages', packageId);
    if (!fs.existsSync(packageDir)) {
      fs.mkdirSync(packageDir, { recursive: true });
    }
    
    // Create a package-specific placeholder image
    const packageColor = getColorForIndex(parseInt(packageId) % 5 + 1);
    const packageTextColor = getTextColor(packageColor);
    
    const packageSvgContent = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${packageColor}"/>
  <text x="50%" y="50%" font-family="Arial" font-size="24" fill="${packageTextColor}" text-anchor="middle" dominant-baseline="middle">Package ${packageId}</text>
</svg>`;
    
    // Save the SVG content to the file - use SVG instead of JPG
    const packageFilePath = path.join(packageDir, '1.svg');
    fs.writeFileSync(packageFilePath, packageSvgContent);
    
    return NextResponse.json({
      success: true,
      message: 'Placeholder images created',
      samplePlaceholders: placeholderNames.map(p => `/images/${path.basename(p)}`),
      packagePlaceholder: `/uploads/packages/${packageId}/1.svg`
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to create placeholder images',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function getColorForIndex(index: number): string {
  const colors = [
    '#4F46E5', // Indigo
    '#059669', // Emerald
    '#D97706', // Amber
    '#7C3AED', // Violet
    '#DC2626'  // Red
  ];
  
  return colors[(index - 1) % colors.length];
}

function getTextColor(backgroundColor: string): string {
  // Simple check for dark vs light background
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate perceived brightness (ITU-R BT.709)
  const brightness = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  
  return brightness > 0.5 ? '#000000' : '#FFFFFF';
} 
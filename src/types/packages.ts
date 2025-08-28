interface AddOn {
  name: string;
  price: number;
  id?: number;
  image?: string; // optional image (data URL or API path)
}

export interface InclusionItem {
  description: string;
  image?: string; // optional image (data URL or API path)
}

export interface PackageData {
  id: number;
  name: string;
  description: string;
  category: string;
  cremationType: string;
  processingTime: string;
  price: number;
  pricingMode?: 'fixed' | 'by_size';
  overageFeePerKg?: number;
  // hasSizePricing is redundant; derive from pricingMode or sizePricing
  sizePricing?: Array<{
    sizeCategory: string;
    weightRangeMin: number;
    weightRangeMax: number;
    price: number;
  }>;
  inclusions: (string | InclusionItem)[];
  addOns: (string | AddOn)[];
  conditions: string;
  images: string[];
  isActive: boolean;
  supportedPetTypes?: string[];
}

interface _PackageFormData {
  name: string;
  description: string;
  category: string;
  cremationType: string;
  processingTime: string;
  price: number;
  pricingMode?: 'fixed' | 'by_size';
  overageFeePerKg?: number;
  // hasSizePricing is redundant; derive from pricingMode or sizePricing
  sizePricing?: Array<{
    sizeCategory: string;
    weightRangeMin: number;
    weightRangeMax: number;
    price: number;
  }>;
  inclusions: (string | InclusionItem)[];
  addOns: (string | AddOn)[];
  conditions: string;
  images: string[];
}

export type ViewMode = 'list' | 'card';

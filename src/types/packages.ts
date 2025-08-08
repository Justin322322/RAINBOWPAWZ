interface AddOn {
  name: string;
  price: number | null;
}

export interface PackageData {
  id: number;
  name: string;
  description: string;
  category: string;
  cremationType: string;
  processingTime: string;
  price: number;
  inclusions: string[];
  addOns: (string | AddOn)[];
  conditions: string;
  images: string[];
  isActive: boolean;
  supportedPetTypes?: string[];
}

interface PackageFormData {
  name: string;
  description: string;
  category: string;
  cremationType: string;
  processingTime: string;
  price: number;
  inclusions: string[];
  addOns: (string | AddOn)[];
  conditions: string;
  images: string[];
}

export type ViewMode = 'list' | 'card';

// serviceProvider.d.ts
declare interface ServiceProvider {
  id: number;
  name: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  description: string;
  type: string;
  packages: number;
  created_at: string;
  distance?: string;
  distanceValue?: number;
  rating?: number;
}

declare interface BusinessProfile {
  id: number;
  name: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  description: string;
  type: string;
  packages: number;
  created_at: string;
  distance?: string;
  distanceValue?: number;
}

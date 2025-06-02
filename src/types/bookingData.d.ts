// bookingData.d.ts
declare interface BookingData {
  id: number;
  user_id: number;
  provider_id: number;
  package_id?: number;
  pet_id?: number;
  status: string;
  booking_date: string;
  booking_time?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  price?: number;
  service_price?: number;
  total_amount?: number;
  delivery_fee?: number;
  delivery_distance?: number;
  delivery_address?: string;
  delivery_option?: string;
  extras: any[];
  extras_total: number;
  service_name?: string;
  provider_name?: string;
  pet_name?: string;
}

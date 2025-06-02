// Standardized interfaces for all user types in the application

export interface BaseUserData {
  id: number;
  email: string;
  role: string;
  user_type: string;
  [key: string]: any; // Allow for other properties
}

export interface AdminData extends BaseUserData {
  username: string;
  full_name: string;
}

export interface BusinessData extends BaseUserData {
  business_id?: number;
  business_name?: string;
  first_name?: string;
  last_name?: string;
  service_provider?: any;
  is_verified?: number;
}

export interface UserData extends BaseUserData {
  first_name: string;
  last_name: string;
  is_otp_verified: number;
}

// Global state interfaces for authentication
export interface AdminAuthState {
  verified: boolean;
  adminData: AdminData | null;
}

export interface BusinessAuthState {
  verified: boolean;
  userData: BusinessData | null;
}

export interface UserAuthState {
  verified: boolean;
  userData: UserData | null;
}

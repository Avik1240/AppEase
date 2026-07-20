export type SalonStatus = "pending" | "approved" | "rejected";

export type Salon = {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  address: string;
  maps_link: string;
  has_expert_pricing: boolean;
  status: SalonStatus;
  rejection_reason: string;
  photos: string[];
  created_at: string;
};

export type SalonHour = {
  id: string;
  salon_id: string;
  day_of_week: number; // 0 = Sunday
  open_time: string; // "HH:MM:SS"
  close_time: string;
};

export type Stylist = {
  id: string;
  salon_id: string;
  name: string;
  is_expert: boolean;
};

export type Service = {
  id: string;
  salon_id: string;
  name: string;
  category: string;
  price: number;
  expert_price: number | null;
  duration_minutes: number;
};

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const SERVICE_CATEGORIES = [
  "haircut",
  "beard",
  "coloring",
  "spa",
  "facial",
  "massage",
  "other",
] as const;

// Form payload types (client → server action)
export type HourInput = {
  day_of_week: number;
  open_time: string; // "HH:MM"
  close_time: string;
};

export type StylistInput = {
  name: string;
  is_expert: boolean;
};

export type ServiceInput = {
  name: string;
  category: string;
  price: number;
  expert_price: number | null;
  duration_minutes: number;
};

export type BookingStatus =
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export type Booking = {
  id: string;
  salon_id: string;
  stylist_id: string;
  service_id: string;
  customer_id: string;
  booking_date: string; // "YYYY-MM-DD"
  start_time: string; // "HH:MM:SS"
  end_time: string;
  price: number;
  status: BookingStatus;
  created_at: string;
};

export type OnboardingPayload = {
  name: string;
  description: string;
  address: string;
  maps_link: string;
  has_expert_pricing: boolean;
  photos: string[];
  hours: HourInput[];
  stylists: StylistInput[];
  services: ServiceInput[];
};

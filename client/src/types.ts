export type UserRole = "RESIDENT" | "SECURITY" | "ADMIN";

export type PassType = "ONE_TIME_PERSON" | "COURIER" | "VEHICLE" | "PERMANENT";

export type PassStatus =
  | "CREATED"
  | "ACTIVE"
  | "USED"
  | "COMPLETED"
  | "CANCELLED"
  | "REJECTED"
  | "EXPIRED"
  | "SUSPENDED";

export type Pass = {
  id: string;
  apartmentId: number;
  createdBy: number;
  type: PassType;
  status: PassStatus;
  visitorName: string;
  vehiclePlate: string | null;
  courierCompany: string | null;
  purpose: string | null;
  validFrom: string;
  validUntil: string;
  createdAt: string;
  updatedAt: string;
  apartmentLabel?: string;
};

export type Me = {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  apartments: { id: number; label: string }[];
};

export type NotificationRow = {
  id: number;
  passId: string | null;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

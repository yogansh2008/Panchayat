// ─────────────────────────────────────────────────────────────────────────────
// Panchayat — Complete TypeScript Interfaces
// ─────────────────────────────────────────────────────────────────────────────

export type UserRole = 'Admin' | 'Resident' | 'Provider' | 'Security' | 'Pending';

export interface UserProfile {
  id?: string;
  uid?: string;
  name: string;
  email: string;
  role: UserRole;
  flatNo?: string;
  societyId?: string;
  societyCode?: string;
  societyName?: string;
  category?: string;       // for Provider
  available?: boolean;     // for Provider
  approved?: boolean;      // for Resident
  approvedAt?: any;
  createdAt?: any;
}

export interface Society {
  id: string;
  name: string;
  code: string;            // unique 6-char code
  address: string;
  adminId: string;
  totalFlats: number;
  createdAt?: any;
}

export interface SocietyFloor {
  id: string;
  societyId: string;
  floor: number;
  units: number;
  rent: number;
}

export interface PendingResident {
  uid: string;
  name: string;
  email: string;
  flatNo: string;
  societyCode: string;
  societyId: string;
  societyName: string;
  status: 'Pending';
  createdAt?: any;
}

export type BillStatus = 'Unpaid' | 'Paid' | 'Overdue';

export interface Bill {
  id: string;
  societyId: string;
  flatNo: string;           // 'All' for society-wide, or specific flat like 'A-101'
  title: string;
  amount: string;
  month: string;
  status: BillStatus;
  duedate: string;
  paidAt?: string;
  createdAt?: any;
}

export type ComplaintStatus = 'Open' | 'In Progress' | 'Resolved';

export interface Complaint {
  id: string;
  societyId: string;
  title: string;
  desc: string;
  anonymous: boolean;
  flatNo: string;
  userId: string;
  status: ComplaintStatus;
  createdAt?: any;
}

export type VisitorStatus = 'Requested' | 'Approved' | 'Denied' | 'In' | 'Out';

export interface Visitor {
  id: string;
  societyId: string;
  name: string;            // visitor name
  flatNo: string;          // which flat they're visiting
  residentId: string;      // who created the pass
  residentName: string;
  type: string;            // 'Guest' | 'Delivery' | 'Cab' | 'Other'
  purpose?: string;
  vehicleNo?: string;
  status: VisitorStatus;
  time?: string;           // entry time
  exitTime?: string;
  date: string;
  createdAt?: any;
}

export type EventStatus = 'Upcoming' | 'Ongoing' | 'Completed';

export interface Event {
  id: string;
  societyId: string;
  title: string;
  desc: string;
  date: string;
  time?: string;
  location?: string;
  status?: EventStatus;
  createdAt?: any;
}

export interface Notice {
  id: string;
  societyId: string;
  title: string;
  desc: string;
  date: string;
  createdAt?: any;
}

export type FundType = 'income' | 'expense';

export interface FundEntry {
  id: string;
  societyId: string;
  type: FundType;
  amount: number;
  description: string;
  date: string;
  createdAt?: any;
}

export type ServiceRequestStatus = 'Open' | 'Accepted' | 'In Progress' | 'Completed' | 'Cancelled';

export interface ServiceRequest {
  id: string;
  societyId: string;
  title: string;
  desc: string;
  flatNo: string;
  residentId: string;
  category: string;
  providerId?: string;
  status: ServiceRequestStatus;
  createdAt?: any;
}

export interface ServiceProvider {
  id: string;
  societyId: string;
  name: string;
  category: string;
  phone: string;
  rating: number;
  available: boolean;
  location?: string;
  lat?: number;
  lng?: number;
}

export interface Guideline {
  id: string;
  societyId: string;
  societyCode: string;
  title: string;
  content: string;
  createdAt?: any;
}

export interface Facility {
  id: string;
  name: string;
  status: 'Available' | 'Booked';
  bookedBy?: string;
  flatNo?: string;
  bookedAt?: string;
}

export interface AdminStats {
  residents: number;
  pendingBills: number;
  openComplaints: number;
  totalIncome: number;
  totalExpenses: number;
  visitorsToday: number;
}

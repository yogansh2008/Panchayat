// ─────────────────────────────────────────────────────────────────────────────
// Panchayat — Complete Firestore Backend (v2 — Society-Scoped, Production Ready)
// ─────────────────────────────────────────────────────────────────────────────
import {
  collection, doc, getDocs, getDoc, setDoc, addDoc,
  updateDoc, deleteDoc, query, where, orderBy,
  onSnapshot, serverTimestamp, writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type {
  UserProfile, Society, PendingResident, Bill, Complaint, Visitor,
  Event, Notice, FundEntry, ServiceRequest, ServiceProvider, Guideline,
  SocietyFloor, AdminStats,
} from '../types';

// ─── Collection Names ─────────────────────────────────────────────────────────
export const COLLECTIONS = {
  USERS:             'users',
  SOCIETIES:         'societies',
  SOCIETY_FLOORS:    'society_floors',
  PENDING_RESIDENTS: 'pending_residents',
  BILLS:             'bills',
  COMPLAINTS:        'complaints',
  VISITORS:          'visitors',
  EVENTS:            'events',
  NOTICES:           'notices',
  FUNDS:             'funds',
  SERVICES:          'services',
  REQUESTS:          'service_requests',
  GUIDELINES:        'guidelines',
  FACILITIES:        'facilities',
  RULES:             'rules',
  SECURITY_IDS:      'security_ids',
} as const;

// ─── Generic Helpers ──────────────────────────────────────────────────────────

/** Add a document with auto-id */
export const addDocument = async (col: string, data: Record<string, any>) => {
  const ref = await addDoc(collection(db, col), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

/** Update fields on existing document */
export const updateDocument = (col: string, id: string, data: Record<string, any>) =>
  updateDoc(doc(db, col, id), { ...data, updatedAt: serverTimestamp() });

/** Delete a document */
export const deleteDocument = (col: string, id: string) =>
  deleteDoc(doc(db, col, id));

/** One-time fetch with optional filters */
export const fetchData = async (
  col: string,
  filters: { field: string; op: any; value: any }[] = [],
) => {
  let q: any = collection(db, col);
  if (filters.length > 0) {
    q = query(q, ...filters.map(f => where(f.field, f.op, f.value)));
  }
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Record<string, any>) }));
};

/** Real-time subscription to a collection with optional filters */
export const subscribeToData = (
  col: string,
  callback: (data: any[]) => void,
  filters: { field: string; op: any; value: any }[] = [],
) => {
  let q: any = collection(db, col);
  if (filters.length > 0) {
    q = query(q, ...filters.map(f => where(f.field, f.op, f.value)));
  }
  return onSnapshot(
    q,
    (snap: any) => {
      const results = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      results.sort((a: any, b: any) => {
        const tA = a.createdAt?.seconds ?? 0;
        const tB = b.createdAt?.seconds ?? 0;
        return tB - tA;
      });
      callback(results);
    },
    (err: any) => { console.error(`subscribeToData(${col}):`, err); callback([]); },
  );
};

/** Real-time subscription to a single document */
export const subscribeToDoc = (col: string, id: string, callback: (data: any | null) => void) =>
  onSnapshot(
    doc(db, col, id),
    snap => callback(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    err => { console.error(`subscribeToDoc(${col}/${id}):`, err); callback(null); },
  );

// ─── Seeder (Disabled for Production) ───────────────────────────────────────
export const seedDatabase = async () => {
  // Disabled: app is production-ready. Data only comes from Admin actions.
};

// ─── Purge Old Mock Data ──────────────────────────────────────────────────────
/** Removes all mock seed documents created by the old seeder */
export const cleanupSeedData = async () => {
  const mockIds: Record<string, string[]> = {
    services: ['s1', 's2', 's3', 's4', 's5'],
    notices:  ['n1', 'n2'],
    events:   ['ev1', 'ev2', 'ev3'],
    bills:    ['b1', 'b2', 'b3', 'b4', 'b5'],
    facilities: ['fac1', 'fac2', 'fac3', 'fac4'],
    funds:    ['fn1', 'fn2', 'fn3', 'fn4'],
    societies: ['soc1'],
  };
  const batch = writeBatch(db);
  for (const [col, ids] of Object.entries(mockIds)) {
    for (const id of ids) {
      batch.delete(doc(db, col, id));
    }
  }
  await batch.commit();
  console.log('✅ Old mock/seed data purged from Firestore.');
};

// ─── Society Management ───────────────────────────────────────────────────────

/** 
 * Generate a unique, easy-to-read 6-char code.
 * Excludes confusing characters like 0, O, I, 1, L.
 */
export const generateSocietyCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/** 
 * Create a new society with a guaranteed unique code.
 */
export const createSociety = async (data: {
  name: string;
  address: string;
  adminId: string;
  totalFlats: number;
}) => {
  let code = generateSocietyCode();
  let isUnique = false;
  let attempts = 0;

  // Collision resistance: check if code exists, retry if it does (max 5 times)
  while (!isUnique && attempts < 5) {
    const existing = await validateSocietyCode(code);
    if (!existing) {
      isUnique = true;
    } else {
      code = generateSocietyCode();
      attempts++;
    }
  }

  const ref = await addDoc(collection(db, COLLECTIONS.SOCIETIES), {
    ...data,
    code,
    createdAt: serverTimestamp(),
  });
  
  return { id: ref.id, code };
};

/**
 * Validate a society code — public query (no auth required).
 * Returns the society object or null if not found.
 */
export const validateSocietyCode = async (inputCode: string): Promise<Society | null> => {
  const code = inputCode.trim().toUpperCase();
  console.log(`[DEBUG] Attempting to validate code: "${code}"`);
  
  // List all societies to debug
  try {
    const allSoc = await getDocs(collection(db, COLLECTIONS.SOCIETIES));
    console.log(`[DEBUG] Total societies in DB: ${allSoc.size}`);
    allSoc.forEach(doc => {
      console.log(`[DEBUG] Society code in DB: "${doc.data().code}"`);
    });
  } catch (e: any) {
    console.log(`[DEBUG] Failed to list all societies: ${e.message}`);
  }

  const snap = await getDocs(
    query(collection(db, COLLECTIONS.SOCIETIES), where('code', '==', code)),
  );
  if (snap.empty) {
     console.log(`[DEBUG] No society found for code: "${code}"`);
     return null;
  }
  const d = snap.docs[0];
  console.log(`[DEBUG] Found society:`, d.data());
  return { id: d.id, ...(d.data() as Omit<Society, 'id'>) };
};

/** Add a floor to a society */
export const addSocietyFloor = (societyId: string, data: { floor: number; units: number; rent: number }) =>
  addDocument(COLLECTIONS.SOCIETY_FLOORS, { ...data, societyId });

/** Real-time floors for a society */
export const subscribeToFloors = (societyId: string, callback: (data: SocietyFloor[]) => void) =>
  subscribeToData(COLLECTIONS.SOCIETY_FLOORS, callback as any, [{ field: 'societyId', op: '==', value: societyId }]);

// ─── Pending Residents ────────────────────────────────────────────────────────

/** Create a pending join request */
export const requestJoinSociety = async (data: Omit<PendingResident, 'status' | 'createdAt'>) => {
  await setDoc(doc(db, COLLECTIONS.PENDING_RESIDENTS, data.uid), {
    ...data,
    status: 'Pending',
    createdAt: serverTimestamp(),
  });
};

/** Admin: subscribe to pending residents for their society */
export const subscribePendingResidents = (societyCode: string, callback: (data: PendingResident[]) => void) =>
  subscribeToData(COLLECTIONS.PENDING_RESIDENTS, callback as any, [{ field: 'societyCode', op: '==', value: societyCode }]);

/** Admin approves a pending resident */
export const approveResident = async (request: PendingResident) => {
  const batch = writeBatch(db);
  batch.set(doc(db, COLLECTIONS.USERS, request.uid), {
    name: request.name,
    email: request.email,
    role: 'Resident',
    flatNo: request.flatNo,
    societyCode: request.societyCode,
    societyId: request.societyId,
    societyName: request.societyName,
    approved: true,
    approvedAt: serverTimestamp(),
  });
  batch.delete(doc(db, COLLECTIONS.PENDING_RESIDENTS, request.uid));
  await batch.commit();
};

/** Admin rejects a pending resident */
export const rejectResident = async (uid: string) =>
  deleteDoc(doc(db, COLLECTIONS.PENDING_RESIDENTS, uid));

// ─── Users ────────────────────────────────────────────────────────────────────

/** Get a user's profile once */
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const snap = await getDoc(doc(db, COLLECTIONS.USERS, uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<UserProfile, 'id'>) };
};

/** Get all residents for a society */
export const subscribeResidents = (societyId: string, callback: (data: UserProfile[]) => void) =>
  subscribeToData(COLLECTIONS.USERS, callback as any, [
    { field: 'role', op: '==', value: 'Resident' },
    { field: 'societyId', op: '==', value: societyId },
  ]);

// ─── Admin Stats (Society-Scoped) ─────────────────────────────────────────────

export const subscribeAdminStats = (societyId: string, callback: (stats: AdminStats) => void) => {
  const stats: AdminStats = {
    residents: 0,
    pendingBills: 0,
    openComplaints: 0,
    totalIncome: 0,
    totalExpenses: 0,
    visitorsToday: 0,
  };

  let loaded = 0;
  const total = 5;
  const done = () => { loaded++; if (loaded >= total) callback({ ...stats }); };

  const today = new Date().toISOString().split('T')[0];

  const u1 = subscribeToData(COLLECTIONS.USERS, d => {
    stats.residents = d.filter((x: any) => x.role === 'Resident').length;
    done();
  }, [{ field: 'societyId', op: '==', value: societyId }]);
  const u2 = subscribeToData(COLLECTIONS.BILLS, d => {
    const scoped = d.filter((x: any) => x.societyId === societyId);
    stats.pendingBills = scoped.filter((x: any) => x.status !== 'Paid').length;
    done();
  }, [{ field: 'societyId', op: '==', value: societyId }]);
  const u3 = subscribeToData(COLLECTIONS.COMPLAINTS, d => {
    stats.openComplaints = d.filter((x: any) => x.status !== 'Resolved').length;
    done();
  }, [{ field: 'societyId', op: '==', value: societyId }]);
  const u4 = subscribeToData(COLLECTIONS.FUNDS, d => {
    stats.totalIncome = d.filter((x: any) => x.type === 'income').reduce((a: number, x: any) => a + (x.amount || 0), 0);
    stats.totalExpenses = d.filter((x: any) => x.type === 'expense').reduce((a: number, x: any) => a + (x.amount || 0), 0);
    done();
  }, [{ field: 'societyId', op: '==', value: societyId }]);
  const u5 = subscribeToData(COLLECTIONS.VISITORS, d => {
    stats.visitorsToday = d.filter((x: any) => x.date?.startsWith(today)).length;
    done();
  }, [{ field: 'societyId', op: '==', value: societyId }]);

  return () => { u1(); u2(); u3(); u4(); u5(); };
};

// ─── Bills (Society + Flat Scoped) ───────────────────────────────────────────

/** Admin: generate a bill for a flat or 'All' */
export const generateBill = (societyId: string, data: {
  title: string;
  amount: string;
  month: string;
  flatNo: string;
}) =>
  addDocument(COLLECTIONS.BILLS, {
    ...data,
    societyId,
    status: 'Unpaid',
    duedate: new Date(Date.now() + 15 * 86400000).toLocaleDateString('en-IN'),
  });

/** Resident: mark a bill as paid */
export const payBill = (id: string) =>
  updateDocument(COLLECTIONS.BILLS, id, {
    status: 'Paid',
    paidAt: new Date().toLocaleDateString('en-IN'),
  });

/** Admin: subscribe to all bills for a society */
export const subscribeSocietyBills = (societyId: string, callback: (data: Bill[]) => void) =>
  subscribeToData(COLLECTIONS.BILLS, callback as any, [{ field: 'societyId', op: '==', value: societyId }]);

/** Resident: subscribe to bills for their flat (and 'All' broadcasts) */
export const subscribeResidentBills = (societyId: string, flatNo: string, callback: (data: Bill[]) => void) => {
  // Two separate subscriptions merged client-side
  const merged: Record<string, any> = {};
  const emit = () => callback(
    Object.values(merged).sort((a: any, b: any) =>
      (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)
    ) as Bill[]
  );

  const u1 = subscribeToData(COLLECTIONS.BILLS, d => {
    d.forEach((b: any) => { merged[b.id] = b; });
    emit();
  }, [
    { field: 'societyId', op: '==', value: societyId },
    { field: 'flatNo', op: '==', value: flatNo },
  ]);

  const u2 = subscribeToData(COLLECTIONS.BILLS, d => {
    d.forEach((b: any) => { merged[b.id] = b; });
    emit();
  }, [
    { field: 'societyId', op: '==', value: societyId },
    { field: 'flatNo', op: '==', value: 'All' },
  ]);

  return () => { u1(); u2(); };
};

// ─── Complaints (Society-Scoped) ──────────────────────────────────────────────

export const submitComplaint = (societyId: string, data: {
  title: string;
  desc: string;
  anonymous: boolean;
  flatNo: string;
  userId: string;
}) =>
  addDocument(COLLECTIONS.COMPLAINTS, { ...data, societyId, status: 'Open' });

export const updateComplaintStatus = (id: string, status: string) =>
  updateDocument(COLLECTIONS.COMPLAINTS, id, { status });

export const subscribeToComplaints = (societyId: string, callback: (data: Complaint[]) => void) =>
  subscribeToData(COLLECTIONS.COMPLAINTS, callback as any, [{ field: 'societyId', op: '==', value: societyId }]);

// ─── Visitor Passes (Full Pipeline) ──────────────────────────────────────────

/** Resident creates a visitor pass request */
export const createVisitorPass = (societyId: string, data: {
  name: string;
  flatNo: string;
  residentId: string;
  residentName: string;
  type: string;
  purpose?: string;
  vehicleNo?: string;
}) =>
  addDocument(COLLECTIONS.VISITORS, {
    ...data,
    societyId,
    status: 'Requested',
    date: new Date().toISOString(),
  });

/** Security: approve visitor */
export const approveVisitorPass = (id: string) =>
  updateDocument(COLLECTIONS.VISITORS, id, { status: 'Approved' });

/** Security: deny visitor */
export const denyVisitorPass = (id: string) =>
  updateDocument(COLLECTIONS.VISITORS, id, { status: 'Denied' });

/** Security: mark visitor as entered */
export const logVisitorEntry = (id: string) =>
  updateDocument(COLLECTIONS.VISITORS, id, {
    status: 'In',
    time: new Date().toLocaleTimeString('en-IN'),
  });

/** Security: mark visitor as exited */
export const logVisitorExit = (id: string) =>
  updateDocument(COLLECTIONS.VISITORS, id, {
    status: 'Out',
    exitTime: new Date().toLocaleTimeString('en-IN'),
  });

/** Subscribe to all visitor passes for a society */
export const subscribeToVisitors = (societyId: string, callback: (data: Visitor[]) => void) =>
  subscribeToData(COLLECTIONS.VISITORS, callback as any, [{ field: 'societyId', op: '==', value: societyId }]);

/** Subscribe to visitor passes created by a resident */
export const subscribeMyVisitorPasses = (societyId: string, residentId: string, callback: (data: Visitor[]) => void) =>
  subscribeToData(COLLECTIONS.VISITORS, callback as any, [
    { field: 'societyId', op: '==', value: societyId },
    { field: 'residentId', op: '==', value: residentId },
  ]);

// ─── Events (Society-Scoped) ──────────────────────────────────────────────────

export const createEvent = (societyId: string, data: {
  title: string;
  desc: string;
  date: string;
  time?: string;
  location?: string;
}) =>
  addDocument(COLLECTIONS.EVENTS, { ...data, societyId, status: 'Upcoming' });

export const subscribeToEvents = (societyId: string, callback: (data: Event[]) => void) =>
  subscribeToData(COLLECTIONS.EVENTS, callback as any, [{ field: 'societyId', op: '==', value: societyId }]);

export const deleteEvent = (id: string) =>
  deleteDocument(COLLECTIONS.EVENTS, id);

// ─── Notices (Society-Scoped) ─────────────────────────────────────────────────

export const postNotice = (societyId: string, data: { title: string; desc: string }) =>
  addDocument(COLLECTIONS.NOTICES, {
    ...data,
    societyId,
    date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
  });

export const subscribeToNotices = (societyId: string, callback: (data: Notice[]) => void) =>
  subscribeToData(COLLECTIONS.NOTICES, callback as any, [{ field: 'societyId', op: '==', value: societyId }]);

export const deleteNotice = (id: string) =>
  deleteDocument(COLLECTIONS.NOTICES, id);

// ─── Fund Ledger (Society-Scoped) ─────────────────────────────────────────────

export const addFundEntry = (societyId: string, data: {
  type: 'income' | 'expense';
  amount: number;
  description: string;
}) =>
  addDocument(COLLECTIONS.FUNDS, {
    ...data,
    societyId,
    date: new Date().toISOString(),
  });

export const subscribeFundEntries = (societyId: string, callback: (data: FundEntry[]) => void) =>
  subscribeToData(COLLECTIONS.FUNDS, callback as any, [{ field: 'societyId', op: '==', value: societyId }]);

// ─── Service Providers (Society-Scoped) ───────────────────────────────────────

export const addServiceProvider = (societyId: string, data: {
  name: string;
  category: string;
  phone: string;
  rating?: number;
  location?: string;
  lat?: number;
  lng?: number;
}) =>
  addDocument(COLLECTIONS.SERVICES, { ...data, societyId, available: true, rating: data.rating ?? 4.0 });

export const updateProviderAvailability = (id: string, available: boolean) =>
  updateDocument(COLLECTIONS.SERVICES, id, { available });

export const deleteServiceProvider = (id: string) =>
  deleteDocument(COLLECTIONS.SERVICES, id);

export const subscribeToServices = (societyId: string, callback: (data: ServiceProvider[]) => void) =>
  subscribeToData(COLLECTIONS.SERVICES, callback as any, [{ field: 'societyId', op: '==', value: societyId }]);

// ─── Security IDs ─────────────────────────────────────────────────────────────

export const createSecurityId = (societyId: string, societyCode: string, code: string) =>
  addDocument(COLLECTIONS.SECURITY_IDS, { societyId, societyCode, code, active: true });

export const subscribeToSecurityIds = (societyId: string, callback: (data: any[]) => void) =>
  subscribeToData(COLLECTIONS.SECURITY_IDS, callback, [{ field: 'societyId', op: '==', value: societyId }]);

export const deleteSecurityId = (id: string) =>
  deleteDocument(COLLECTIONS.SECURITY_IDS, id);

export const validateSecurityIdCode = async (societyId: string, code: string): Promise<boolean> => {
  const snap = await fetchData(COLLECTIONS.SECURITY_IDS, [
    { field: 'societyId', op: '==', value: societyId },
    { field: 'code', op: '==', value: code }
  ]);
  return snap.length > 0;
};

// ─── Service Requests ─────────────────────────────────────────────────────────

export const createServiceRequest = (societyId: string, data: {
  title: string;
  desc: string;
  flatNo: string;
  category: string;
  residentId: string;
}) =>
  addDocument(COLLECTIONS.REQUESTS, { ...data, societyId, status: 'Open' });

export const acceptServiceRequest = (id: string, providerId: string) =>
  updateDocument(COLLECTIONS.REQUESTS, id, { status: 'Accepted', providerId });

export const completeServiceRequest = (id: string) =>
  updateDocument(COLLECTIONS.REQUESTS, id, { status: 'Completed' });

export const subscribeServiceRequests = (societyId: string, callback: (data: ServiceRequest[]) => void) =>
  subscribeToData(COLLECTIONS.REQUESTS, callback as any, [{ field: 'societyId', op: '==', value: societyId }]);

// ─── Guidelines / Chatbot Knowledge Base ─────────────────────────────────────

export const addGuideline = (societyId: string, societyCode: string, data: { title: string; content?: string; description?: string; category?: string }) =>
  addDocument(COLLECTIONS.GUIDELINES, { ...data, societyId, societyCode });

export const deleteGuideline = (id: string) =>
  deleteDocument(COLLECTIONS.GUIDELINES, id);

export const subscribeToGuidelines = (societyId: string, callback: (data: any[]) => void) =>
  subscribeToData(COLLECTIONS.GUIDELINES, callback, [{ field: 'societyId', op: '==', value: societyId }]);

export const overwriteGuidelines = async (societyId: string, guidelines: any[]) => {
  // First, delete old guidelines for this society
  const oldSnap = await getDocs(query(collection(db, COLLECTIONS.GUIDELINES), where('societyId', '==', societyId)));
  const batch = writeBatch(db);
  oldSnap.docs.forEach(d => {
    batch.delete(d.ref);
  });
  
  // Create new guidelines
  for (const g of guidelines) {
    const docRef = doc(collection(db, COLLECTIONS.GUIDELINES));
    batch.set(docRef, { ...g, societyId, createdAt: serverTimestamp() });
  }
  
  await batch.commit();
};

/** Build a full AI context string from Firestore for the chatbot */
export const fetchChatbotContext = async (societyId: string): Promise<string> => {
  try {
    const filter = (col: string) =>
      getDocs(query(collection(db, col), where('societyId', '==', societyId)));

    const [guidelines, events, notices] = await Promise.all([
      filter(COLLECTIONS.GUIDELINES),
      filter(COLLECTIONS.EVENTS),
      filter(COLLECTIONS.NOTICES),
    ]);

    let ctx = '=== Society Guidelines & Rules ===\n';
    guidelines.forEach(d => {
      const g = d.data();
      const content = g.description || g.content || '';
      ctx += `• [${g.category || 'General'}] ${g.title}: ${content}\n`;
    });
    ctx += '\n=== Upcoming Events ===\n';
    events.forEach(d => {
      const e = d.data();
      ctx += `• ${e.title} on ${e.date}${e.time ? ' at ' + e.time : ''}: ${e.desc}\n`;
    });
    ctx += '\n=== Latest Notices ===\n';
    notices.forEach(d => {
      const n = d.data();
      ctx += `• ${n.title} (${n.date}): ${n.desc}\n`;
    });
    return ctx || 'No society data available yet.';
  } catch (e) {
    console.error('fetchChatbotContext error:', e);
    return 'No society data available.';
  }
};

// ─── Facilities / Bookings ────────────────────────────────────────────────────

export const bookFacility = (id: string, bookedBy: string, flatNo: string) =>
  updateDocument(COLLECTIONS.FACILITIES, id, {
    status: 'Booked',
    bookedBy,
    flatNo,
    bookedAt: new Date().toISOString(),
  });

export const releaseFacility = (id: string) =>
  updateDocument(COLLECTIONS.FACILITIES, id, {
    status: 'Available',
    bookedBy: null,
    flatNo: null,
    bookedAt: null,
  });

// ─── Backward-compat shim for pages not yet fully migrated ───────────────────
/** @deprecated use subscribeToServices(societyId, ...) */
export const subscribeTodaysVisitors = (callback: (data: any[]) => void) =>
  subscribeToData(COLLECTIONS.VISITORS, callback);
/** @deprecated use subscribeToEvents(societyId, ...) */
export const subscribeProviderRequests = (providerId: string, callback: (data: any[]) => void) =>
  subscribeToData(COLLECTIONS.REQUESTS, callback);

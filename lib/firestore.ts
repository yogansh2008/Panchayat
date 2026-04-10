import {
  collection,
  doc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  getDoc,
} from 'firebase/firestore';
import { db } from './firebase';

// ─── Collection Names ────────────────────────────────────────────────────────
export const COLLECTIONS = {
  SERVICES:          'services',
  COMPLAINTS:        'complaints',
  EVENTS:            'events',
  NOTICES:           'notices',
  BILLS:             'bills',
  FACILITIES:        'facilities',
  VISITORS:          'visitors',
  RULES:             'rules',
  SOCIETIES:         'societies',
  FUNDS:             'funds',
  USERS:             'users',
  REQUESTS:          'service_requests',
  GUIDELINES:        'guidelines',          // AI chatbot knowledge base
  PENDING_RESIDENTS: 'pending_residents',   // Awaiting admin approval
  SOCIETY_FLOORS:    'society_floors',      // Floor/rent details
};

// ─── Seed Data ───────────────────────────────────────────────────────────────
const SEED: Record<string, any[]> = {
  services: [
    { id: 's1', name: 'Ram Kumar',         category: 'Plumber',     phone: '9876543210', rating: 4.8, location: 'Block A, Basement',        available: true },
    { id: 's2', name: 'Sparky Electricals', category: 'Electrician', phone: '9876543211', rating: 4.5, location: 'Market Complex Shop 3',     available: true },
    { id: 's3', name: 'Fresh Mart',         category: 'Grocery',     phone: '9876543212', rating: 4.2, location: 'Main Gate',                 available: true },
    { id: 's4', name: 'Dr. Meera Sharma',  category: 'Doctor',      phone: '9876543213', rating: 4.9, location: 'Tower C, Ground Floor',     available: false },
    { id: 's5', name: 'CleanPro Services', category: 'Cleaner',     phone: '9876543214', rating: 4.3, location: 'Basement Utility Room',      available: true },
  ],
  notices: [
    { id: 'n1', title: 'AGM Meeting',            date: '25th Oct', desc: 'Annual General Meeting in Community Hall at 7 PM.',          createdAt: new Date().toISOString() },
    { id: 'n2', title: 'Water Supply Shutdown',  date: '22nd Oct', desc: 'Water supply will be off from 10 AM – 2 PM for tank cleaning.', createdAt: new Date().toISOString() },
  ],
  events: [
    { id: 'e1', title: 'Diwali Celebration', date: '24th Oct, 7 PM', desc: 'Join us for Diwali night party and dinner in the garden!',   createdAt: new Date().toISOString() },
    { id: 'e2', title: 'Yoga Morning',        date: 'Every Sunday, 6 AM', desc: 'Free yoga sessions for all residents in the park.',     createdAt: new Date().toISOString() },
  ],
  complaints: [
    { id: 'c1', title: 'Lift stuck in Block B', status: 'In Progress', anonymous: true,  desc: 'Lift #2 has been stuck since morning.', flatNo: 'B-201', date: new Date().toISOString() },
    { id: 'c2', title: 'Street light broken',   status: 'Open',        anonymous: false, desc: 'Lamp near parking lot not working.',   flatNo: 'A-102', date: new Date().toISOString() },
  ],
  bills: [
    { id: 'b1', title: 'Maintenance Bill', month: 'October 2026',   amount: '₹2,500', status: 'Unpaid', duedate: '05 Nov 2026', date: null,           flatNo: 'All' },
    { id: 'b2', title: 'Maintenance Bill', month: 'September 2026', amount: '₹2,500', status: 'Paid',   duedate: '05 Sep 2026', date: '04 Sep 2026', flatNo: 'All' },
  ],
  facilities: [
    { id: 'f1', name: 'Community Hall',  status: 'Available', type: 'Event',        capacity: 200 },
    { id: 'f2', name: 'Meeting Room',    status: 'Booked',    type: 'Professional', capacity: 20  },
    { id: 'f3', name: 'Guest Room 1',   status: 'Available', type: 'Guest',        capacity: 4   },
    { id: 'f4', name: 'Swimming Pool',  status: 'Available', type: 'Recreation',   capacity: 50  },
    { id: 'f5', name: 'Badminton Court',status: 'Available', type: 'Sports',       capacity: 4   },
  ],
  visitors: [
    { id: 'v1', name: 'Zomato Delivery', flatNo: 'B-201', time: '2:00 PM', status: 'Pending', type: 'Delivery', date: new Date().toISOString() },
  ],
  rules: [
    { id: 'r1', title: 'Swimming Pool Rules',  desc: 'Timings: 6 AM–8 AM & 5 PM–9 PM. Proper swimwear mandatory. No children under 10 without adult.' },
    { id: 'r2', title: 'Parking Guidelines',    desc: 'Visitor parking at designated zone near main gate only. No overnight visitor parking allowed.' },
    { id: 'r3', title: 'Noise Restrictions',    desc: 'No loud music or noise after 10 PM. Parties need 48-hour notice to RWA.' },
    { id: 'r4', title: 'Pet Policy',            desc: 'Pets must be on leash in common areas. Pet owners responsible for cleanliness.' },
  ],
  funds: [
    { id: 'fn1', type: 'income',  amount: 120000, description: 'Maintenance Collection October', date: new Date().toISOString() },
    { id: 'fn2', type: 'expense', amount: 45000,  description: 'Security Staff Salary',          date: new Date().toISOString() },
    { id: 'fn3', type: 'expense', amount: 12000,  description: 'Electricity Bill Common Areas',  date: new Date().toISOString() },
    { id: 'fn4', type: 'income',  amount: 5000,   description: 'Hall Booking Fees',              date: new Date().toISOString() },
  ],
  societies: [
    { id: 'soc1', name: 'Green Valley Apartments', address: 'Plot 4, Sector 12, Noida', adminId: '', code: 'GV123', totalFlats: 150 },
  ],
  service_requests: [],
};

// ─── Seed Database ────────────────────────────────────────────────────────────
export const seedDatabase = async () => {
  try {
    const promises = Object.entries(SEED).map(async ([colName, dataArr]) => {
      if (dataArr.length === 0) return;
      const snapshot = await getDocs(collection(db, colName));
      if (snapshot.empty) {
        const docPromises = dataArr.map(item => {
          const { id, ...data } = item;
          return setDoc(doc(db, colName, id), data);
        });
        await Promise.all(docPromises);
      }
    });
    await Promise.all(promises);
  } catch (error) {
    console.error('Seed error:', error);
  }
};

// ─── Generic CRUD ─────────────────────────────────────────────────────────────

/** One-time fetch */
export const fetchData = async (col: string, filters?: { field: string; op: any; value: any }[]) => {
  try {
    let q: any = collection(db, col);
    if (filters && filters.length > 0) {
      q = query(q, ...filters.map(f => where(f.field, f.op, f.value)));
    }
    const snap = await getDocs(q);
    return snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as Record<string, any>) }));
  } catch (e) {
    console.error(`fetchData(${col})`, e);
    return [];
  }
};

/** Add document (auto-id) */
export const addDocument = async (col: string, data: any) => {
  try {
    const ref = await addDoc(collection(db, col), {
      ...data,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch (e) {
    console.error(`addDocument(${col})`, e);
    throw e;
  }
};

/** Update existing document */
export const updateDocument = async (col: string, id: string, data: any) => {
  try {
    await updateDoc(doc(db, col, id), { ...data, updatedAt: serverTimestamp() });
  } catch (e) {
    console.error(`updateDocument(${col}/${id})`, e);
    throw e;
  }
};

/** Delete document */
export const deleteDocument = async (col: string, id: string) => {
  try {
    await deleteDoc(doc(db, col, id));
  } catch (e) {
    console.error(`deleteDocument(${col}/${id})`, e);
    throw e;
  }
};

/** Real-time subscription (whole collection) */
export const subscribeToData = (
  col: string,
  callback: (data: any[]) => void,
  filters?: { field: string; op: any; value: any }[],
) => {
  let q: any = collection(db, col);
  if (filters && filters.length > 0) {
    q = query(q, ...filters.map(f => where(f.field, f.op, f.value)));
  }
  return onSnapshot(
    q,
    (snap: any) => {
      const results = snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as Record<string, any>) }));
      // Automatically sort newly added items to the top based on their server timestamp or fallback ISO string
      results.sort((a: any, b: any) => {
        const tA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
        const tB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
        return tB - tA;
      });
      callback(results);
    },
    (err: any) => { console.error(`subscribeToData(${col})`, err); callback([]); },
  );
};

/** Real-time subscription for a single document */
export const subscribeToDoc = (
  col: string,
  id: string,
  callback: (data: any | null) => void,
) =>
  onSnapshot(
    doc(db, col, id),
    snap => callback(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    err => { console.error(`subscribeToDoc(${col}/${id})`, err); callback(null); },
  );

// ─── Role-Specific Real-Time APIs ────────────────────────────────────────────

/** Admin: live stats aggregated from all collections */
export const subscribeAdminStats = (callback: (stats: any) => void) => {
  const stats: any = { residents: 0, pendingBills: 0, openComplaints: 0, visitors: 0 };
  let pending = 3;
  const done = () => { pending -= 1; if (pending === 0) callback({ ...stats }); };

  const u1 = subscribeToData(COLLECTIONS.USERS, d => { stats.residents = d.filter(x => x.role === 'Resident').length; done(); });
  const u2 = subscribeToData(COLLECTIONS.BILLS, d => { stats.pendingBills = d.filter(x => x.status !== 'Paid').length; done(); });
  const u3 = subscribeToData(COLLECTIONS.COMPLAINTS, d => { stats.openComplaints = d.filter(x => x.status !== 'Resolved').length; done(); });

  return () => { u1(); u2(); u3(); };
};

/** Resident: bills scoped by flatNo OR 'All' */
export const subscribeResidentBills = (flatNo: string, callback: (data: any[]) => void) =>
  subscribeToData(COLLECTIONS.BILLS, callback);   // Filter client-side for simplicity

/** Provider: service requests assigned to this provider */
export const subscribeProviderRequests = (providerId: string, callback: (data: any[]) => void) =>
  subscribeToData(COLLECTIONS.REQUESTS, callback);

/** Security: today's visitor log */
export const subscribeTodaysVisitors = (callback: (data: any[]) => void) =>
  subscribeToData(COLLECTIONS.VISITORS, callback);

// ─── Service Request Actions ─────────────────────────────────────────────────

export const createServiceRequest = (data: {
  title: string;
  desc: string;
  flatNo: string;
  category: string;
  residentId: string;
}) => addDocument(COLLECTIONS.REQUESTS, { ...data, status: 'Open' });

export const acceptServiceRequest = (id: string, providerId: string) =>
  updateDocument(COLLECTIONS.REQUESTS, id, { status: 'Accepted', providerId });

export const completeServiceRequest = (id: string) =>
  updateDocument(COLLECTIONS.REQUESTS, id, { status: 'Completed' });

// ─── Complaint Actions ────────────────────────────────────────────────────────

export const submitComplaint = (data: {
  title: string;
  desc: string;
  anonymous: boolean;
  flatNo: string;
  userId: string;
}) => addDocument(COLLECTIONS.COMPLAINTS, { ...data, status: 'Open' });

export const resolveComplaint = (id: string) =>
  updateDocument(COLLECTIONS.COMPLAINTS, id, { status: 'Resolved' });

// ─── Bill Actions ─────────────────────────────────────────────────────────────

export const payBill = (id: string) =>
  updateDocument(COLLECTIONS.BILLS, id, {
    status: 'Paid',
    paidAt: new Date().toLocaleDateString(),
  });

export const generateBill = (data: {
  title: string;
  amount: string;
  month: string;
  flatNo: string;
}) =>
  addDocument(COLLECTIONS.BILLS, {
    ...data,
    status: 'Unpaid',
    duedate: new Date(Date.now() + 15 * 86400000).toLocaleDateString(),
  });

// ─── Visitor Actions ─────────────────────────────────────────────────────────

export const logVisitorEntry = (data: {
  name: string;
  flatNo: string;
  type?: string;
}) =>
  addDocument(COLLECTIONS.VISITORS, {
    ...data,
    status: 'In',
    time: new Date().toLocaleTimeString(),
    date: new Date().toISOString(),
  });

export const approveVisitor = (id: string) =>
  updateDocument(COLLECTIONS.VISITORS, id, { status: 'Approved' });

export const denyVisitor = (id: string) =>
  updateDocument(COLLECTIONS.VISITORS, id, { status: 'Denied' });

export const logVisitorExit = (id: string) =>
  updateDocument(COLLECTIONS.VISITORS, id, {
    status: 'Out',
    exitTime: new Date().toLocaleTimeString(),
  });

// ─── Facility Actions ─────────────────────────────────────────────────────────

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
  });

// ─── Notice / Event Actions ───────────────────────────────────────────────────

export const postNotice = (data: { title: string; desc: string }) =>
  addDocument(COLLECTIONS.NOTICES, {
    ...data,
    date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
  });

export const createEvent = (data: { title: string; desc: string; date: string }) =>
  addDocument(COLLECTIONS.EVENTS, data);

// ─── Fund Ledger Actions ──────────────────────────────────────────────────────

export const addFundEntry = (data: {
  type: 'income' | 'expense';
  amount: number;
  description: string;
}) =>
  addDocument(COLLECTIONS.FUNDS, {
    ...data,
    date: new Date().toISOString(),
  });

// ─── Provider Availability ────────────────────────────────────────────────────

export const updateProviderAvailability = (uid: string, available: boolean) =>
  updateDocument(COLLECTIONS.USERS, uid, { available });

// ─── Society Management ───────────────────────────────────────────────────────

/** Generate a random 6-char alphanumeric code */
export const generateSocietyCode = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

/** Create a new society and return the doc id */
export const createSociety = async (data: {
  name: string;
  address: string;
  adminId: string;
  totalFlats: number;
}) => {
  const code = generateSocietyCode();
  const ref = await addDoc(collection(db, COLLECTIONS.SOCIETIES), {
    ...data,
    code,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, code };
};

/** Validate a society code — returns the society doc or null */
export const validateSocietyCode = async (code: string) => {
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.SOCIETIES), where('code', '==', code.toUpperCase()))
  );
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as Record<string, any>) };
};

/** Add a floor entry to a society */
export const addSocietyFloor = (societyId: string, data: {
  floor: number;
  units: number;
  rent: number;
}) => addDocument(COLLECTIONS.SOCIETY_FLOORS, { ...data, societyId });

/** Get floors for a society */
export const subscribeToFloors = (societyId: string, callback: (data: any[]) => void) =>
  subscribeToData(COLLECTIONS.SOCIETY_FLOORS, callback, [{ field: 'societyId', op: '==', value: societyId }]);

// ─── Pending Resident Requests ────────────────────────────────────────────────

/** Resident requests to join a society — creates a pending entry */
export const requestJoinSociety = async (data: {
  uid: string;
  name: string;
  email: string;
  flatNo: string;
  societyCode: string;
  societyId: string;
  societyName: string;
}) => {
  await setDoc(doc(db, COLLECTIONS.PENDING_RESIDENTS, data.uid), {
    ...data,
    status: 'Pending',
    createdAt: serverTimestamp(),
  });
};

/** Admin approves a pending resident — moves them to users collection */
export const approveResident = async (request: any) => {
  await setDoc(doc(db, COLLECTIONS.USERS, request.uid), {
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
  await deleteDoc(doc(db, COLLECTIONS.PENDING_RESIDENTS, request.uid));
};

/** Admin rejects a pending resident */
export const rejectResident = async (uid: string) =>
  deleteDoc(doc(db, COLLECTIONS.PENDING_RESIDENTS, uid));

/** Subscribe to pending requests for a specific society code */
export const subscribePendingResidents = (societyCode: string, callback: (data: any[]) => void) =>
  subscribeToData(COLLECTIONS.PENDING_RESIDENTS, callback, [{ field: 'societyCode', op: '==', value: societyCode }]);

// ─── Guidelines (Chatbot Knowledge Base) ─────────────────────────────────────

export const addGuideline = (societyCode: string, data: { title: string; content: string }) =>
  addDocument(COLLECTIONS.GUIDELINES, { ...data, societyCode });

export const deleteGuideline = (id: string) =>
  deleteDoc(doc(db, COLLECTIONS.GUIDELINES, id));

export const subscribeToGuidelines = (societyCode: string, callback: (data: any[]) => void) =>
  subscribeToData(COLLECTIONS.GUIDELINES, callback, [{ field: 'societyCode', op: '==', value: societyCode }]);

/** Fetch all guidelines for AI context — also pulls rules */
export const fetchChatbotContext = async (societyCode: string): Promise<string> => {
  try {
    const [guidelines, rules, events, notices] = await Promise.all([
      getDocs(query(collection(db, COLLECTIONS.GUIDELINES), where('societyCode', '==', societyCode))),
      getDocs(collection(db, COLLECTIONS.RULES)),
      getDocs(collection(db, COLLECTIONS.EVENTS)),
      getDocs(collection(db, COLLECTIONS.NOTICES)),
    ]);
    let context = '=== Society Guidelines ===\n';
    guidelines.forEach(d => {
      const g = d.data();
      context += `• ${g.title}: ${g.content}\n`;
    });
    context += '\n=== Society Rules ===\n';
    rules.forEach(d => {
      const r = d.data();
      context += `• ${r.title}: ${r.desc}\n`;
    });
    context += '\n=== Upcoming Events ===\n';
    events.forEach(d => {
      const e = d.data();
      context += `• ${e.title} on ${e.date}: ${e.desc}\n`;
    });
    context += '\n=== Latest Notices ===\n';
    notices.forEach(d => {
      const n = d.data();
      context += `• ${n.title} (${n.date}): ${n.desc}\n`;
    });
    return context;
  } catch (e) {
    console.error('fetchChatbotContext error', e);
    return 'No society data available.';
  }
};

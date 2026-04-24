// ─────────────────────────────────────────────────────────────────────────────
// Gate Pass — Firestore functions (add to backend/db/firestore.ts)
// Collection: gatepasses
// ─────────────────────────────────────────────────────────────────────────────

import {
  collection, doc, addDoc, updateDoc, query,
  where, onSnapshot, serverTimestamp, orderBy,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export const GP = 'gatepasses'; // collection name

// ── Types ─────────────────────────────────────────────────────────────────────
export type GatePassStatus = 'Pending' | 'Approved' | 'Rejected' | 'Entered' | 'Exited' | 'Pending Resident';

export interface GatePass {
  id: string;
  visitorName: string;
  phone: string;
  purpose: string;
  date: string;
  entryTime: string;
  residentId: string;
  residentName: string;
  flatNumber: string;
  societyId: string;
  status: GatePassStatus;
  createdBy?: 'Resident' | 'Security';
  createdAt?: any;
  approvedAt?: any;
  enteredAt?: string;
  exitedAt?: string;
  rejectedAt?: any;
}

// ── Create gate pass (Resident) ───────────────────────────────────────────────
export const createGatePass = (data: Omit<GatePass, 'id' | 'status' | 'createdAt'>) =>
  addDoc(collection(db, GP), {
    ...data,
    status: 'Pending',
    createdBy: 'Resident',
    createdAt: serverTimestamp(),
  });

// ── Create Walk-In Pass (Security) ────────────────────────────────────────────
export const createWalkInPass = (data: Omit<GatePass, 'id' | 'status' | 'createdAt'>) =>
  addDoc(collection(db, GP), {
    ...data,
    status: 'Pending Resident',
    createdBy: 'Security',
    createdAt: serverTimestamp(),
  });

// ── Update status generically ─────────────────────────────────────────────────
export const updateGatePassStatus = (id: string, status: GatePassStatus, extra: Record<string, any> = {}) =>
  updateDoc(doc(db, GP, id), { status, ...extra });

// ── Approve (Security/Admin) ──────────────────────────────────────────────────
export const approveGatePass = (id: string) =>
  updateGatePassStatus(id, 'Approved', { approvedAt: serverTimestamp() });

// ── Reject (Security/Admin) ───────────────────────────────────────────────────
export const rejectGatePass = (id: string) =>
  updateGatePassStatus(id, 'Rejected', { rejectedAt: serverTimestamp() });

// ── Approve (Resident) ────────────────────────────────────────────────────────
export const residentApprovePass = (id: string) =>
  updateGatePassStatus(id, 'Approved', { approvedByResidentAt: serverTimestamp() });

// ── Reject (Resident) ─────────────────────────────────────────────────────────
export const residentRejectPass = (id: string) =>
  updateGatePassStatus(id, 'Rejected', { rejectedByResidentAt: serverTimestamp() });

// ── Mark Entered (Security) ───────────────────────────────────────────────────
export const markEntered = (id: string) =>
  updateGatePassStatus(id, 'Entered', {
    enteredAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
  });

// ── Mark Exited (Security) ────────────────────────────────────────────────────
export const markExited = (id: string) =>
  updateGatePassStatus(id, 'Exited', {
    exitedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
  });

// ── Subscribe: All gate passes for a society (Admin / Security) ───────────────
export const subscribeGatePasses = (societyId: string, cb: (data: GatePass[]) => void) => {
  const q = query(
    collection(db, GP),
    where('societyId', '==', societyId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<GatePass, 'id'>) })));
  });
};

// ── Subscribe: Resident's own gate passes ─────────────────────────────────────
export const subscribeMyGatePasses = (societyId: string, residentId: string, cb: (data: GatePass[]) => void) => {
  const q = query(
    collection(db, GP),
    where('societyId', '==', societyId),
    where('residentId', '==', residentId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<GatePass, 'id'>) })));
  });
};

/**
 * Document Permalink Management System
 * 
 * URL Structure for internship.marliontech.com:
 * 
 * Offer Letters:    /v/offer/{documentId}     → e.g., /v/offer/INT25W4KX9
 * Certificates:     /v/cert/{documentId}      → e.g., /v/cert/MT25WA3B2
 * Portfolios:       /v/portfolio/{documentId} → e.g., /v/portfolio/PF25WC1D4
 * 
 * Short URLs (for QR codes):
 * /v/{shortCode}  → Auto-redirects to the correct document type
 * 
 * Document IDs are stored in Firebase with metadata for easy lookup
 */

import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { getFirebaseClient } from '@marlion/config';

// Document types
export type DocumentType = 'offer' | 'certificate' | 'portfolio';

// Document metadata stored in Firebase
export interface DocumentRecord {
  id: string;                    // Unique document ID (e.g., INT25W4KX9)
  shortCode: string;             // Short 8-char code for QR
  type: DocumentType;
  studentId: string;
  studentEmail: string;
  studentName: string;
  stream: string;
  college?: string;
  
  // Type-specific fields
  offerRefNumber?: string;       // For offer letters
  certificateId?: string;        // For certificates
  portfolioId?: string;          // For portfolios
  
  // Metadata
  createdAt: Timestamp;
  issuedAt?: Timestamp;
  approvedAt?: Timestamp;
  approvedBy?: string;
  
  // Status
  status: 'pending' | 'approved' | 'revoked';
  revokedAt?: Timestamp;
  revokedReason?: string;
  
  // URLs
  fullUrl: string;
  shortUrl: string;
  qrCodeUrl?: string;
}

// Generate a unique document ID based on type
export function generateDocumentId(type: DocumentType, year: number = new Date().getFullYear()): string {
  const prefix = {
    offer: 'INT',
    certificate: 'MT',
    portfolio: 'PF'
  }[type];
  
  const yearSuffix = year.toString().slice(-2);
  const season = 'W'; // Winter batch
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  
  return `${prefix}${yearSuffix}${season}${random}`;
}

// Generate a short code for QR codes (8 chars)
export function generateShortCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No confusing chars (0,O,1,I)
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Get the base URL for documents
export function getDocumentBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://internship.marliontech.com';
}

// Generate full URL for a document
export function getDocumentUrl(type: DocumentType, documentId: string): string {
  const base = getDocumentBaseUrl();
  const pathMap = {
    offer: 'offer',
    certificate: 'cert',
    portfolio: 'portfolio'
  };
  return `${base}/v/${pathMap[type]}/${documentId}`;
}

// Generate short URL for QR code
export function getShortUrl(shortCode: string): string {
  return `${getDocumentBaseUrl()}/v/${shortCode}`;
}

// Create or update a document record
export async function createDocumentRecord(
  type: DocumentType,
  studentId: string,
  studentData: {
    email: string;
    name: string;
    stream: string;
    college?: string;
  },
  additionalData?: Partial<DocumentRecord>
): Promise<DocumentRecord> {
  const { db } = getFirebaseClient();
  
  // Check if document already exists for this student and type
  const existingQuery = query(
    collection(db, 'documentRecords'),
    where('studentId', '==', studentId),
    where('type', '==', type)
  );
  const existingDocs = await getDocs(existingQuery);
  
  if (!existingDocs.empty) {
    // Return existing record
    return existingDocs.docs[0].data() as DocumentRecord;
  }
  
  // Generate new IDs
  const documentId = generateDocumentId(type);
  const shortCode = generateShortCode();
  
  const record: DocumentRecord = {
    id: documentId,
    shortCode,
    type,
    studentId,
    studentEmail: studentData.email,
    studentName: studentData.name,
    stream: studentData.stream,
    college: studentData.college,
    createdAt: Timestamp.now(),
    status: 'pending',
    fullUrl: getDocumentUrl(type, documentId),
    shortUrl: getShortUrl(shortCode),
    ...additionalData
  };
  
  // Save to Firebase
  await setDoc(doc(db, 'documentRecords', documentId), record);
  
  // Also create a short code lookup
  await setDoc(doc(db, 'documentShortCodes', shortCode), {
    documentId,
    type,
    createdAt: serverTimestamp()
  });
  
  return record;
}

// Get document by ID
export async function getDocumentById(documentId: string): Promise<DocumentRecord | null> {
  const { db } = getFirebaseClient();
  const docRef = doc(db, 'documentRecords', documentId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return docSnap.data() as DocumentRecord;
  }
  return null;
}

// Get document by short code
export async function getDocumentByShortCode(shortCode: string): Promise<DocumentRecord | null> {
  const { db } = getFirebaseClient();
  const codeRef = doc(db, 'documentShortCodes', shortCode);
  const codeSnap = await getDoc(codeRef);
  
  if (codeSnap.exists()) {
    const { documentId } = codeSnap.data();
    return getDocumentById(documentId);
  }
  return null;
}

// Get all documents for a student
export async function getStudentDocuments(studentId: string): Promise<DocumentRecord[]> {
  const { db } = getFirebaseClient();
  const q = query(
    collection(db, 'documentRecords'),
    where('studentId', '==', studentId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => d.data() as DocumentRecord);
}

// Approve a document
export async function approveDocument(
  documentId: string, 
  approvedBy: string
): Promise<void> {
  const { db } = getFirebaseClient();
  const docRef = doc(db, 'documentRecords', documentId);
  
  await setDoc(docRef, {
    status: 'approved',
    approvedAt: serverTimestamp(),
    approvedBy,
    issuedAt: serverTimestamp()
  }, { merge: true });
}

// Revoke a document
export async function revokeDocument(
  documentId: string,
  reason: string
): Promise<void> {
  const { db } = getFirebaseClient();
  const docRef = doc(db, 'documentRecords', documentId);
  
  await setDoc(docRef, {
    status: 'revoked',
    revokedAt: serverTimestamp(),
    revokedReason: reason
  }, { merge: true });
}

// Verify a document (for verification portal)
export interface VerificationResult {
  valid: boolean;
  status: 'approved' | 'pending' | 'revoked' | 'not_found';
  document?: DocumentRecord;
  message: string;
}

export async function verifyDocument(idOrShortCode: string): Promise<VerificationResult> {
  // Try by document ID first
  let record = await getDocumentById(idOrShortCode);
  
  // If not found, try by short code
  if (!record) {
    record = await getDocumentByShortCode(idOrShortCode);
  }
  
  if (!record) {
    return {
      valid: false,
      status: 'not_found',
      message: 'Document not found. Please check the ID and try again.'
    };
  }
  
  if (record.status === 'revoked') {
    return {
      valid: false,
      status: 'revoked',
      document: record,
      message: `This document was revoked on ${record.revokedAt?.toDate().toLocaleDateString()}. Reason: ${record.revokedReason || 'Not specified'}`
    };
  }
  
  if (record.status === 'pending') {
    return {
      valid: false,
      status: 'pending',
      document: record,
      message: 'This document is pending approval and not yet valid.'
    };
  }
  
  return {
    valid: true,
    status: 'approved',
    document: record,
    message: 'Document verified successfully.'
  };
}

// Get document statistics for admin dashboard
export async function getDocumentStats(): Promise<{
  total: number;
  offers: { pending: number; approved: number; revoked: number };
  certificates: { pending: number; approved: number; revoked: number };
  portfolios: { pending: number; approved: number; revoked: number };
}> {
  const { db } = getFirebaseClient();
  const snapshot = await getDocs(collection(db, 'documentRecords'));
  
  const stats = {
    total: snapshot.size,
    offers: { pending: 0, approved: 0, revoked: 0 },
    certificates: { pending: 0, approved: 0, revoked: 0 },
    portfolios: { pending: 0, approved: 0, revoked: 0 }
  };
  
  snapshot.forEach(doc => {
    const data = doc.data() as DocumentRecord;
    const typeKey = data.type === 'offer' ? 'offers' : 
                    data.type === 'certificate' ? 'certificates' : 'portfolios';
    stats[typeKey][data.status]++;
  });
  
  return stats;
}

// Format document type for display
export function formatDocumentType(type: DocumentType): string {
  return {
    offer: 'Offer Letter',
    certificate: 'Completion Certificate',
    portfolio: 'Professional Portfolio'
  }[type];
}

// Get document icon for UI
export function getDocumentIcon(type: DocumentType): string {
  return {
    offer: '📜',
    certificate: '🎓',
    portfolio: '💼'
  }[type];
}

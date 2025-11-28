import { NextResponse } from 'next/server';

const FIREBASE_PROJECT_ID = 'marlioninternshipportal2025';
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

// Helper to parse Firestore REST API field values
function parseFirestoreValue(value: any): any {
  if (!value) return null;
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return parseInt(value.integerValue);
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.timestampValue !== undefined) return new Date(value.timestampValue);
  if (value.nullValue !== undefined) return null;
  return null;
}

function parseFirestoreFields(fields: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(fields)) {
    result[key] = parseFirestoreValue(value);
  }
  return result;
}

export async function GET() {
  try {
    const response = await fetch(`${FIRESTORE_URL}/students?pageSize=500`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Firestore REST error:', response.status);
      return NextResponse.json({
        totalStudents: 0,
        pendingInterviews: 0,
        activeInterns: 0,
        completedInterns: 0,
        byStream: {},
        byCollege: {},
      });
    }

    const data = await response.json();
    
    let totalStudents = 0;
    let pendingInterviews = 0;
    let activeInterns = 0;
    let completedInterns = 0;
    const byStream: Record<string, number> = {};
    const byCollege: Record<string, number> = {};

    (data.documents || []).forEach((doc: any) => {
      const fields = parseFirestoreFields(doc.fields || {});
      totalStudents++;

      // Count by status
      const status = fields.status || 'registered';
      if (status === 'interview_pending' || status === 'interview_done') {
        pendingInterviews++;
      } else if (status === 'active' || status === 'selected' || status === 'offer_downloaded') {
        activeInterns++;
      } else if (status === 'completed') {
        completedInterns++;
      }

      // Count by stream
      const stream = fields.chosenStream || 'unknown';
      byStream[stream] = (byStream[stream] || 0) + 1;

      // Count by college
      const college = fields.college || 'Other';
      byCollege[college] = (byCollege[college] || 0) + 1;
    });

    return NextResponse.json({
      totalStudents,
      pendingInterviews,
      activeInterns,
      completedInterns,
      byStream,
      byCollege,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({
      totalStudents: 0,
      pendingInterviews: 0,
      activeInterns: 0,
      completedInterns: 0,
      byStream: {},
      byCollege: {},
    });
  }
}

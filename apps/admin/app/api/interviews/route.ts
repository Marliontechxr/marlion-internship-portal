import { NextRequest, NextResponse } from 'next/server';

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
  if (value.arrayValue) {
    return (value.arrayValue.values || []).map(parseFirestoreValue);
  }
  if (value.mapValue) {
    return parseFirestoreFields(value.mapValue.fields || {});
  }
  return null;
}

function parseFirestoreFields(fields: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(fields)) {
    result[key] = parseFirestoreValue(value);
  }
  return result;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId');

  try {
    if (studentId) {
      // Get specific student's interview
      const response = await fetch(`${FIRESTORE_URL}/interviews/${studentId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        return NextResponse.json({ interview: null });
      }

      const doc = await response.json();
      const fields = parseFirestoreFields(doc.fields || {});
      
      return NextResponse.json({
        interview: {
          studentId,
          transcript: fields.transcript || [],
          summary: fields.summary || '',
          score: fields.score || 0,
          completedAt: fields.completedAt || null,
        }
      });
    } else {
      // Get all interviews
      const response = await fetch(`${FIRESTORE_URL}/interviews?pageSize=100`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        return NextResponse.json({ interviews: [] });
      }

      const data = await response.json();
      
      const interviews = (data.documents || []).map((doc: any) => {
        const fields = parseFirestoreFields(doc.fields || {});
        const docPath = doc.name.split('/');
        const id = docPath[docPath.length - 1];
        
        return {
          studentId: id,
          transcript: fields.transcript || [],
          summary: fields.summary || '',
          score: fields.score || 0,
          completedAt: fields.completedAt || null,
        };
      });

      return NextResponse.json({ interviews });
    }
  } catch (error) {
    console.error('Error fetching interviews:', error);
    return NextResponse.json({ error: 'Failed to fetch interviews' }, { status: 500 });
  }
}

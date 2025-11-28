import { NextRequest, NextResponse } from 'next/server';

const FIREBASE_PROJECT_ID = 'marlioninternshipportal2025';
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

export async function POST(request: NextRequest) {
  try {
    const { studentId, action } = await request.json();
    
    if (!studentId || !action) {
      return NextResponse.json({ error: 'Missing studentId or action' }, { status: 400 });
    }

    let newStatus: string;
    switch (action) {
      case 'accept':
        newStatus = 'selected';
        break;
      case 'reject':
        newStatus = 'rejected';
        break;
      case 'ban':
        newStatus = 'banned';
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Use Firebase REST API to update the student document
    const updateUrl = `${FIRESTORE_URL}/students/${studentId}?updateMask.fieldPaths=status&updateMask.fieldPaths=updatedAt`;
    
    const response = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          status: { stringValue: newStatus },
          updatedAt: { timestampValue: new Date().toISOString() },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Firestore update error:', errorText);
      return NextResponse.json({ error: 'Failed to update student' }, { status: 500 });
    }

    return NextResponse.json({ success: true, newStatus });
  } catch (error) {
    console.error('Error updating student:', error);
    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 });
  }
}

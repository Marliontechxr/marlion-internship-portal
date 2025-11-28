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
  try {
    // Use Firebase REST API to fetch students (no auth required for public read)
    const response = await fetch(`${FIRESTORE_URL}/students?pageSize=100`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Firestore REST error:', response.status, errorText);
      return NextResponse.json({ error: 'Failed to fetch students', students: [] }, { status: 500 });
    }

    const data = await response.json();
    
    const students = (data.documents || []).map((doc: any) => {
      const fields = parseFirestoreFields(doc.fields || {});
      // Extract document ID from name (e.g., "projects/.../documents/students/abc123")
      const docPath = doc.name.split('/');
      const id = docPath[docPath.length - 1];
      
      // Handle bootcampProgress - can be object or number
      let bootcampProgress = 0;
      if (typeof fields.bootcampProgress === 'number') {
        bootcampProgress = fields.bootcampProgress;
      } else if (fields.bootcampProgress?.totalProgress !== undefined) {
        bootcampProgress = fields.bootcampProgress.totalProgress;
      }
      
      return {
        id,
        name: fields.name || '',
        email: fields.email || '',
        phone: fields.phone || '',
        college: fields.college || '',
        collegeOther: fields.collegeOther || '',
        year: fields.year || 1,
        department: fields.department || '',
        chosenStream: fields.chosenStream || '',
        internshipStart: fields.internshipStart || null,
        internshipEnd: fields.internshipEnd || null,
        specialRequests: fields.specialRequests || '',
        status: fields.status || 'registered',
        aiInterviewSummary: fields.aiInterviewSummary || '',
        aiScore: fields.aiScore || null,
        aiRecommendation: fields.aiRecommendation || null,
        // Journey tracking fields
        bootcampProgress: bootcampProgress,
        projectProgress: fields.projectProgress || 0,
        projectAssignment: fields.projectAssignment || null,
        assignedProblemStatement: fields.assignedProblemStatement || null,
        projectSubmissionStatus: fields.projectSubmissionStatus || null,
        appliedProblemStatementId: fields.appliedProblemStatementId || null,
        // Offer letter fields
        offerDownloaded: fields.offerDownloaded || false,
        offerDownloadedAt: fields.offerDownloadedAt || null,
        offerRefNumber: fields.offerRefNumber || null,
        // Certificate fields
        certificateRequested: fields.certificateRequested || false,
        certificateRequestedAt: fields.certificateRequestedAt || null,
        certificateApproved: fields.certificateApproved || false,
        certificateApprovedAt: fields.certificateApprovedAt || null,
        certificateIssued: fields.certificateIssued || false,
        certificateIssuedAt: fields.certificateIssuedAt || null,
        certificateSummary: fields.certificateSummary || null,
        certificateId: fields.certificateId || null,
        // Other fields
        dailyLogsCount: fields.dailyLogsCount || 0,
        laptopConfig: fields.laptopConfig || '',
        graphicsCard: fields.graphicsCard || '',
        collegeIdUrl: fields.collegeIdUrl || '',
        createdAt: fields.createdAt || new Date(),
        updatedAt: fields.updatedAt || new Date(),
      };
    });

    return NextResponse.json({ students });
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json({ error: 'Failed to fetch students', students: [] }, { status: 500 });
  }
}

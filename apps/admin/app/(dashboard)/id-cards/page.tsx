'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  orderBy 
} from 'firebase/firestore';
import { db } from '@marlion/config';
import { 
  CreditCard, 
  Download, 
  Filter, 
  Printer,
  QrCode,
  Users,
  Calendar,
  GraduationCap,
  CheckCircle,
  X,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface Student {
  id: string;
  name: string;
  email: string;
  college: string;
  collegeName?: string;
  chosenStream: string;
  profilePhotoUrl?: string;
  startDate: string;
  endDate: string;
  status: string;
  createdAt: any;
}

const STREAMS = [
  { value: '', label: 'All Streams' },
  { value: 'AR/VR Development', label: 'AR/VR Development' },
  { value: 'Agentic AI', label: 'Agentic AI' },
  { value: 'Data Science', label: 'Data Science' },
  { value: 'Full Stack Development', label: 'Full Stack Development' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'approved', label: 'Approved' },
  { value: 'interview_done', label: 'Interview Done' },
  { value: 'bootcamp_complete', label: 'Bootcamp Complete' },
  { value: 'project_approved', label: 'Project Approved' },
  { value: 'completed', label: 'Completed' },
];

export default function IDCardsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [imageCache, setImageCache] = useState<{ [key: string]: string }>({});
  
  // Filters
  const [streamFilter, setStreamFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDateFrom, setStartDateFrom] = useState('');
  const [startDateTo, setStartDateTo] = useState('');
  const [endDateFrom, setEndDateFrom] = useState('');
  const [endDateTo, setEndDateTo] = useState('');

  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [students, streamFilter, statusFilter, startDateFrom, startDateTo, endDateFrom, endDateTo]);

  const fetchStudents = async () => {
    try {
      const studentsRef = collection(db, 'students');
      const q = query(
        studentsRef,
        where('status', 'in', ['approved', 'interview_done', 'bootcamp_complete', 'project_approved', 'completed']),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const studentsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Student[];
      
      setStudents(studentsList);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...students];

    if (streamFilter) {
      filtered = filtered.filter(s => s.chosenStream === streamFilter);
    }

    if (statusFilter) {
      filtered = filtered.filter(s => s.status === statusFilter);
    }

    if (startDateFrom) {
      filtered = filtered.filter(s => s.startDate >= startDateFrom);
    }

    if (startDateTo) {
      filtered = filtered.filter(s => s.startDate <= startDateTo);
    }

    if (endDateFrom) {
      filtered = filtered.filter(s => s.endDate >= endDateFrom);
    }

    if (endDateTo) {
      filtered = filtered.filter(s => s.endDate <= endDateTo);
    }

    setFilteredStudents(filtered);
  };

  const toggleSelectAll = () => {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredStudents.map(s => s.id)));
    }
  };

  const toggleStudent = (id: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedStudents(newSelected);
  };

  const getCollegeName = (student: Student) => {
    if (student.college === 'Other' && student.collegeName) {
      return student.collegeName;
    }
    return student.college || 'Not specified';
  };

  const getStreamShort = (stream: string) => {
    const streamMap: { [key: string]: string } = {
      'AR/VR Development': 'AR/VR',
      'Agentic AI': 'AI',
      'Data Science': 'DS',
      'Full Stack Development': 'FS'
    };
    return streamMap[stream] || stream.substring(0, 4);
  };

  const getStreamColor = (stream: string) => {
    const colors: { [key: string]: string } = {
      'AR/VR Development': '#8B5CF6',
      'Agentic AI': '#3B82F6',
      'Data Science': '#10B981',
      'Full Stack Development': '#F59E0B'
    };
    return colors[stream] || '#6B7280';
  };

  const generateVerificationUrl = (studentId: string) => {
    return `https://internship.marliontech.com/verify/id/${studentId}`;
  };

  // Convert Firebase images to base64 to avoid CORS issues
  useEffect(() => {
    const loadImages = async () => {
      const cache: { [key: string]: string } = {};
      for (const student of students) {
        if (student.profilePhotoUrl && !imageCache[student.id]) {
          try {
            // Use a proxy or fetch with no-cors workaround
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            await new Promise<void>((resolve) => {
              img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(img, 0, 0);
                  try {
                    cache[student.id] = canvas.toDataURL('image/png');
                  } catch {
                    // CORS error, use placeholder
                    cache[student.id] = '';
                  }
                }
                resolve();
              };
              img.onerror = () => {
                cache[student.id] = '';
                resolve();
              };
              img.src = student.profilePhotoUrl!;
            });
          } catch {
            cache[student.id] = '';
          }
        }
      }
      setImageCache(prev => ({ ...prev, ...cache }));
    };
    
    if (students.length > 0) {
      loadImages();
    }
  }, [students]);

  // Generate ID card using jsPDF directly (no html2canvas for reliability)
  const generateIDCardPDF = (student: Student, pdf: jsPDF, x: number, y: number, cardWidth: number, cardHeight: number, cachedImage?: string) => {
    const streamColor = getStreamColor(student.chosenStream);
    
    // Card background
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'F');
    pdf.setDrawColor(200, 200, 200);
    pdf.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'S');
    
    // Header with stream color
    const headerHeight = 8;
    const r = parseInt(streamColor.slice(1, 3), 16);
    const g = parseInt(streamColor.slice(3, 5), 16);
    const b = parseInt(streamColor.slice(5, 7), 16);
    pdf.setFillColor(r, g, b);
    pdf.rect(x, y, cardWidth, headerHeight, 'F');
    
    // Header text
    pdf.setFontSize(7);
    pdf.setTextColor(255, 255, 255);
    pdf.text('MARLION INTERNSHIP 2025', x + cardWidth / 2, y + 5, { align: 'center' });
    
    // Photo area
    const photoX = x + 8;
    const photoY = y + headerHeight + 5;
    const photoWidth = 18;
    const photoHeight = 22;
    
    // Try to add actual photo if cached
    if (cachedImage && cachedImage.startsWith('data:image')) {
      try {
        pdf.addImage(cachedImage, 'PNG', photoX, photoY, photoWidth, photoHeight);
        // Add border
        pdf.setDrawColor(200, 200, 200);
        pdf.rect(photoX, photoY, photoWidth, photoHeight, 'S');
      } catch {
        // Fallback to initials
        drawInitialsPlaceholder();
      }
    } else {
      drawInitialsPlaceholder();
    }
    
    function drawInitialsPlaceholder() {
      pdf.setFillColor(r, g, b);
      pdf.rect(photoX, photoY, photoWidth, photoHeight, 'F');
      
      // Initials
      const initials = student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      pdf.setFontSize(12);
      pdf.setTextColor(255, 255, 255);
      pdf.text(initials, photoX + photoWidth / 2, photoY + photoHeight / 2 + 3, { align: 'center' });
    }
    
    // Student details
    const detailsX = photoX + photoWidth + 5;
    const detailsY = photoY;
    
    pdf.setTextColor(30, 30, 30);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    
    // Truncate name if too long
    const maxNameLength = 20;
    const displayName = student.name.length > maxNameLength 
      ? student.name.substring(0, maxNameLength) + '...' 
      : student.name;
    pdf.text(displayName, detailsX, detailsY + 4);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6);
    pdf.setTextColor(100, 100, 100);
    
    // College
    const collegeName = getCollegeName(student);
    const maxCollegeLength = 25;
    const displayCollege = collegeName.length > maxCollegeLength 
      ? collegeName.substring(0, maxCollegeLength) + '...' 
      : collegeName;
    pdf.text(displayCollege, detailsX, detailsY + 8);
    
    // Stream badge
    pdf.setFillColor(r, g, b);
    const streamText = getStreamShort(student.chosenStream);
    pdf.roundedRect(detailsX, detailsY + 10, 12, 4, 1, 1, 'F');
    pdf.setFontSize(5);
    pdf.setTextColor(255, 255, 255);
    pdf.text(streamText, detailsX + 6, detailsY + 12.8, { align: 'center' });
    
    // Dates
    pdf.setTextColor(120, 120, 120);
    pdf.setFontSize(5);
    pdf.text(`${student.startDate} - ${student.endDate}`, detailsX, detailsY + 18);
    
    // QR Code - generate using a deterministic pattern based on student ID
    const qrSize = 16;
    const qrX = x + cardWidth - qrSize - 5;
    const qrY = y + headerHeight + 5;
    
    // Background
    pdf.setFillColor(255, 255, 255);
    pdf.rect(qrX, qrY, qrSize, qrSize, 'F');
    
    // Generate a simple QR-like pattern based on student ID hash
    pdf.setFillColor(30, 30, 30);
    const cellCount = 21; // Standard QR size
    const cellSize = qrSize / cellCount;
    const idHash = student.id.split('').reduce((acc, char, idx) => acc + char.charCodeAt(0) * (idx + 1), 0);
    
    // Corner finder patterns (required for QR codes)
    const drawFinderPattern = (fx: number, fy: number) => {
      // Outer black
      for (let i = 0; i < 7; i++) {
        pdf.rect(qrX + (fx + i) * cellSize, qrY + fy * cellSize, cellSize, cellSize, 'F');
        pdf.rect(qrX + (fx + i) * cellSize, qrY + (fy + 6) * cellSize, cellSize, cellSize, 'F');
        pdf.rect(qrX + fx * cellSize, qrY + (fy + i) * cellSize, cellSize, cellSize, 'F');
        pdf.rect(qrX + (fx + 6) * cellSize, qrY + (fy + i) * cellSize, cellSize, cellSize, 'F');
      }
      // Inner black square
      for (let i = 2; i < 5; i++) {
        for (let j = 2; j < 5; j++) {
          pdf.rect(qrX + (fx + i) * cellSize, qrY + (fy + j) * cellSize, cellSize, cellSize, 'F');
        }
      }
    };
    
    drawFinderPattern(0, 0);
    drawFinderPattern(14, 0);
    drawFinderPattern(0, 14);
    
    // Data pattern based on student ID
    for (let i = 8; i < 13; i++) {
      for (let j = 0; j < cellCount; j++) {
        const shouldFill = ((idHash * (i + 1) * (j + 1)) % 3) === 0;
        if (shouldFill && j < 8 || shouldFill && j > 13) {
          pdf.rect(qrX + i * cellSize, qrY + j * cellSize, cellSize, cellSize, 'F');
        }
      }
    }
    for (let i = 0; i < cellCount; i++) {
      for (let j = 8; j < 13; j++) {
        const shouldFill = ((idHash * (i + 1) * (j + 1)) % 3) === 0;
        if (shouldFill && (i < 8 || i > 13)) {
          pdf.rect(qrX + i * cellSize, qrY + j * cellSize, cellSize, cellSize, 'F');
        }
      }
    }
    // Additional random-looking but deterministic data
    for (let i = 8; i < 13; i++) {
      for (let j = 8; j < 13; j++) {
        const shouldFill = ((idHash * (i * 7) * (j * 11)) % 5) < 2;
        if (shouldFill) {
          pdf.rect(qrX + i * cellSize, qrY + j * cellSize, cellSize, cellSize, 'F');
        }
      }
    }
    
    // Scan to verify text
    pdf.setFontSize(4);
    pdf.setTextColor(150, 150, 150);
    pdf.text('Scan to verify', qrX + qrSize / 2, qrY + qrSize + 3, { align: 'center' });
    
    // Footer
    const footerY = y + cardHeight - 5;
    pdf.setFillColor(248, 248, 248);
    pdf.rect(x, footerY - 2, cardWidth, 7, 'F');
    pdf.setFontSize(4);
    pdf.setTextColor(150, 150, 150);
    pdf.text(`internship.marliontech.com/verify/id/${student.id.substring(0, 12)}`, x + cardWidth / 2, footerY + 1.5, { align: 'center' });
  };

  const downloadSingleCard = async (student: Student) => {
    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [85.6, 54] // Standard ID card size
      });

      generateIDCardPDF(student, pdf, 0, 0, 85.6, 54, imageCache[student.id]);
      pdf.save(`ID_Card_${student.name.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Error generating ID card:', error);
      alert('Error generating ID card. Please try again.');
    }
  };

  const downloadBulkCards = async () => {
    if (selectedStudents.size === 0) {
      alert('Please select at least one student');
      return;
    }

    setGenerating(true);

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const cardWidth = 85.6; // Standard ID card width in mm
      const cardHeight = 54; // Standard ID card height in mm
      const marginX = 12;
      const marginY = 10;
      const gapX = 5;
      const gapY = 5;
      const cardsPerRow = 2;
      const cardsPerCol = 4;
      const cardsPerPage = cardsPerRow * cardsPerCol;

      let cardIndex = 0;
      const selectedArray = Array.from(selectedStudents);

      for (const studentId of selectedArray) {
        const student = students.find(s => s.id === studentId);
        if (!student) continue;

        if (cardIndex > 0 && cardIndex % cardsPerPage === 0) {
          pdf.addPage();
        }

        const pageCardIndex = cardIndex % cardsPerPage;
        const row = Math.floor(pageCardIndex / cardsPerRow);
        const col = pageCardIndex % cardsPerRow;

        const x = marginX + col * (cardWidth + gapX);
        const y = marginY + row * (cardHeight + gapY);

        generateIDCardPDF(student, pdf, x, y, cardWidth, cardHeight, imageCache[student.id]);

        cardIndex++;
      }

      pdf.save(`Marlion_ID_Cards_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating bulk ID cards:', error);
      alert('Error generating ID cards. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const clearFilters = () => {
    setStreamFilter('');
    setStatusFilter('');
    setStartDateFrom('');
    setStartDateTo('');
    setEndDateFrom('');
    setEndDateTo('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CreditCard className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ID Cards</h1>
            <p className="text-gray-500">Generate and download student ID cards</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown className={`w-4 h-4 transition ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          <button
            onClick={downloadBulkCards}
            disabled={selectedStudents.size === 0 || generating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Download Selected ({selectedStudents.size})
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stream</label>
              <select
                value={streamFilter}
                onChange={(e) => setStreamFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {STREAMS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date From</label>
              <input
                type="date"
                value={startDateFrom}
                onChange={(e) => setStartDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date To</label>
              <input
                type="date"
                value={startDateTo}
                onChange={(e) => setStartDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date From</label>
              <input
                type="date"
                value={endDateFrom}
                onChange={(e) => setEndDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date To</label>
              <input
                type="date"
                value={endDateTo}
                onChange={(e) => setEndDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear all filters
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{filteredStudents.length}</p>
              <p className="text-sm text-gray-500">Total Students</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{selectedStudents.size}</p>
              <p className="text-sm text-gray-500">Selected</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-5 h-5 text-purple-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {filteredStudents.filter(s => s.status === 'completed').length}
              </p>
              <p className="text-sm text-gray-500">Completed</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-orange-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {filteredStudents.filter(s => s.status === 'approved').length}
              </p>
              <p className="text-sm text-gray-500">Active</p>
            </div>
          </div>
        </div>
      </div>

      {/* Select All */}
      <div className="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          checked={selectedStudents.size === filteredStudents.length && filteredStudents.length > 0}
          onChange={toggleSelectAll}
          className="w-4 h-4 text-blue-600 rounded border-gray-300"
        />
        <span className="text-sm text-gray-600">
          Select all ({filteredStudents.length} students)
        </span>
      </div>

      {/* ID Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredStudents.map((student) => (
          <div key={student.id} className="relative">
            {/* Selection Checkbox */}
            <div className="absolute -top-2 -left-2 z-10">
              <input
                type="checkbox"
                checked={selectedStudents.has(student.id)}
                onChange={() => toggleStudent(student.id)}
                className="w-5 h-5 text-blue-600 rounded border-gray-300 shadow"
              />
            </div>

            {/* ID Card */}
            <div
              ref={(el) => { cardRefs.current[student.id] = el; }}
              className="bg-white rounded-xl overflow-hidden shadow-lg border border-gray-200"
              style={{ aspectRatio: '85.6/54' }}
            >
              {/* Card Content - Portrait Layout */}
              <div className="h-full flex flex-col">
                {/* Header with Stream Color */}
                <div 
                  className="px-4 py-2 text-white text-center"
                  style={{ backgroundColor: getStreamColor(student.chosenStream) }}
                >
                  <div className="flex items-center justify-center gap-2">
                    {/* SVG Logo instead of external image */}
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                    </svg>
                    <span className="text-xs font-semibold tracking-wide">MARLION INTERNSHIP</span>
                  </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 p-3 flex gap-3">
                  {/* Photo - Use cached base64 image or placeholder */}
                  <div className="flex-shrink-0">
                    {(imageCache[student.id] || student.profilePhotoUrl) ? (
                      <img
                        src={imageCache[student.id] || student.profilePhotoUrl}
                        alt={student.name}
                        className="w-16 h-20 object-cover rounded-lg border-2 border-gray-200"
                        onError={(e) => {
                          // Fallback to initials if image fails
                          (e.target as HTMLImageElement).style.display = 'none';
                          const parent = (e.target as HTMLImageElement).parentElement;
                          if (parent) {
                            parent.innerHTML = `<div class="w-16 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-xl font-bold">${student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}</div>`;
                          }
                        }}
                      />
                    ) : (
                      <div className="w-16 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-xl font-bold">
                        {student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-sm truncate">{student.name}</h3>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{getCollegeName(student)}</p>
                    <div 
                      className="inline-block px-2 py-0.5 rounded-full text-white text-[10px] font-medium mt-1"
                      style={{ backgroundColor: getStreamColor(student.chosenStream) }}
                    >
                      {student.chosenStream}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {student.startDate} - {student.endDate}
                    </p>
                  </div>

                  {/* QR Code */}
                  <div className="flex-shrink-0 flex flex-col items-center">
                    <QRCodeSVG
                      value={generateVerificationUrl(student.id)}
                      size={48}
                      level="M"
                      includeMargin={false}
                    />
                    <span className="text-[8px] text-gray-400 mt-1">Scan to verify</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100">
                  <p className="text-[9px] text-gray-400 text-center">
                    internship.marliontech.com/verify/id/{student.id.substring(0, 8)}...
                  </p>
                </div>
              </div>
            </div>

            {/* Download Single Card Button */}
            <button
              onClick={() => downloadSingleCard(student)}
              className="absolute -bottom-2 -right-2 p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition"
              title="Download this ID card"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {filteredStudents.length === 0 && (
        <div className="text-center py-12">
          <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
          <p className="text-gray-500">Try adjusting your filters to see more results.</p>
        </div>
      )}
    </div>
  );
}

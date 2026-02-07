'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { jsPDF } from 'jspdf';
import './globals.css';

interface Student {
  id: number;
  name: string;
  class_id: number;
  class_name: string;
}

interface Assessment {
  id: number;
  class_id: number;
  teacher_id: number;
  subject_id: number;
  topic: string;
  assessment_date: string;
  class_name: string;
  teacher_name: string;
  subject_name: string;
}

interface Class {
  id: number;
  name: string;
}

interface AssessmentDetail {
  assessment: Assessment;
  students: Array<{
    id: number;
    name: string;
    class_id: number;
    rating_type: string | null;
  }>;
}

interface Analytics {
  totalStudents: number;
  totalAssessments: number;
  uniqueClasses: number;
  uniqueTeachers: number;
  byClass: Record<string, number>;
  byTeacher: Record<string, number>;
  bySubject: Record<string, number>;
  recentAssessments: Assessment[];
}

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'daftar' | 'penilaian' | 'analisis'>('daftar');
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<AssessmentDetail | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [bulkImportFile, setBulkImportFile] = useState<File | null>(null);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [showCreateAssessmentModal, setShowCreateAssessmentModal] = useState(false);
  const [newAssessment, setNewAssessment] = useState({
    class_id: '',
    teacher_name: '',
    subject_name: '',
    topic: '',
    assessment_date: new Date().toISOString().split('T')[0],
  });
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingClass, setEditingClass] = useState<string>('');
  const [showManualAddStudentModal, setShowManualAddStudentModal] = useState(false);
  const [manualStudentName, setManualStudentName] = useState('');
  const [manualStudentClass, setManualStudentClass] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<string>('');

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');
    
    if (!token) {
      router.push('/login');
      return;
    }
    
    if (user) {
      setCurrentUser(user);
    }
    loadClasses();
    loadStudents();
    if (activeTab === 'penilaian') {
      loadAssessments();
    } else {
      // Clear selected assessment when switching away from penilaian tab
      setSelectedAssessment(null);
    }
    if (activeTab === 'analisis') {
      loadAnalytics();
    }
  }, [activeTab]);

  const loadClasses = async () => {
    try {
      const response = await fetch('/api/classes');
      const data = await response.json();
      if (data.success) {
        setClasses(data.data);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const loadStudents = async () => {
    try {
      const response = await fetch('/api/students-new');
      const data = await response.json();
      if (data.success) {
        setStudents(data.data);
      }
    } catch (error) {
      console.error('Error loading students:', error);
    }
  };

  const loadAssessments = async () => {
    try {
      setSelectedAssessment(null);
      const response = await fetch('/api/assessments');
      const data = await response.json();
      if (data.success) {
        setAssessments(data.data);
      }
    } catch (error) {
      console.error('Error loading assessments:', error);
    }
  };

  const loadAssessmentDetail = async (assessmentId: number) => {
    try {
      const response = await fetch(`/api/assessments/${assessmentId}`);
      const data = await response.json();
      if (data.success) {
        setSelectedAssessment(data.data);
      }
    } catch (error) {
      console.error('Error loading assessment detail:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics-new');
      const data = await response.json();
      if (data.success) {
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      // Still logout locally even if server request fails
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      router.push('/login');
    }
  };

  const handleBulkImportStudents = async () => {
    if (!bulkImportFile) {
      alert('Sila pilih file CSV');
      return;
    }

    setBulkImporting(true);
    try {
      const text = await bulkImportFile.text();
      const lines = text.trim().split('\n');

      if (lines.length < 1) {
        alert('File CSV kosong');
        setBulkImporting(false);
        return;
      }

      const studentsList = lines.map(line => {
        const matches = line.match(/("([^"]*)"|[^,]+)/g) || [];
        const parts = matches.map(part => part.replace(/^"|"$/g, '').trim());

        return {
          name: parts[0]?.trim() || '',
          class_name: parts[1]?.trim() || '',
        };
      });

      const response = await fetch('/api/students-new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: studentsList }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`Berjaya: ${data.results.successCount} murid\nGagal: ${data.results.failureCount}`);
        setBulkImportFile(null);
        setShowBulkImportModal(false);
        loadStudents();
      } else {
        alert('Gagal import: ' + data.error);
      }
    } catch (error) {
      console.error('Error importing:', error);
      alert('Gagal import data');
    } finally {
      setBulkImporting(false);
    }
  };

  const handleCreateAssessment = async () => {
    if (!newAssessment.class_id || !newAssessment.teacher_name.trim() || !newAssessment.subject_name.trim() || !newAssessment.assessment_date.trim()) {
      alert('Sila lengkapkan semua maklumat');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: newAssessment.class_id,
          teacher_name: newAssessment.teacher_name,
          subject_name: newAssessment.subject_name,
          topic: newAssessment.topic,
          assessment_date: newAssessment.assessment_date,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Penilaian berjaya dibuat');
        setNewAssessment({
          class_id: '',
          teacher_name: '',
          subject_name: '',
          topic: '',
          assessment_date: new Date().toISOString().split('T')[0],
        });
        setShowCreateAssessmentModal(false);
        loadAssessments();
        loadAssessmentDetail(data.data.id);
      } else {
        alert('Gagal buat penilaian: ' + data.error);
      }
    } catch (error) {
      console.error('Error creating assessment:', error);
      alert('Gagal buat penilaian');
    } finally {
      setLoading(false);
    }
  };

  const handleRatingClick = async (studentId: number, ratingType: string, isCurrentlySelected: boolean) => {
    if (!selectedAssessment) return;

    try {
      // If clicking the same button (currently selected), deselect it (set to NULL)
      // If clicking a different button, select it
      const newValue = isCurrentlySelected ? null : ratingType;
      
      const response = await fetch('/api/ratings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          assessment_id: selectedAssessment.assessment.id,
          rating_type: newValue,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Update UI - set the selected rating for this student
        setSelectedAssessment(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            students: prev.students.map(student => {
              if (student.id === studentId) {
                return { ...student, rating_type: newValue };
              }
              return student;
            }),
          };
        });
      } else {
        alert('Gagal kemaskini penilaian');
      }
    } catch (error) {
      console.error('Error updating rating:', error);
      alert('Gagal kemaskini penilaian');
    }
  };

  const getRatingValue = (student: any, ratingType: string): boolean => {
    // Check if this student's rating_type matches the given ratingType
    return student.rating_type === ratingType;
  };

  const handleOpenEditStudent = (student: Student) => {
    setEditingStudent(student);
    setEditingName(student.name);
    setEditingClass(student.class_id.toString());
    setShowEditStudentModal(true);
  };

  const handleSaveEditStudent = async () => {
    if (!editingStudent || !editingName.trim() || !editingClass) {
      alert('Sila lengkapkan semua maklumat');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/students-new/${editingStudent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingName.trim(),
          class_id: parseInt(editingClass),
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Maklumat murid berjaya dikemaskini');
        setShowEditStudentModal(false);
        setEditingStudent(null);
        loadStudents();
      } else {
        alert('Gagal kemaskini: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating student:', error);
      alert('Gagal kemaskini murid');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (student: Student) => {
    if (!confirm(`Anda pasti ingin padam "${student.name}"? Tindakan ini tidak boleh dibuat asal.`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/students-new/${student.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (data.success) {
        alert('Murid berjaya dipadamkan');
        loadStudents();
      } else {
        alert('Gagal padam: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting student:', error);
      alert('Gagal padam murid');
    } finally {
      setLoading(false);
    }
  };

  const exportAssessment = (assessmentId: number, format: 'pdf' | 'csv') => {
    try {
      if (format === 'pdf') {
        // Generate PDF client-side using jsPDF with proper table layout
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let yPos = 15;

        // Title
        doc.setFontSize(16);
        doc.setFont('Helvetica', 'bold');
        doc.text('Laporan Penilaian Murid', pageWidth / 2, yPos, { align: 'center' });
        yPos += 12;

        // Assessment details
        doc.setFontSize(10);
        doc.setFont('Helvetica', 'normal');
        doc.text(`Kelas: ${selectedAssessment?.assessment.class_name}`, 12, yPos);
        yPos += 6;
        doc.text(`Guru: ${selectedAssessment?.assessment.teacher_name || 'Tidak Ditentukan'}`, 12, yPos);
        yPos += 6;
        doc.text(`Subjek: ${selectedAssessment?.assessment.subject_name || 'Tidak Ditentukan'}`, 12, yPos);
        yPos += 6;
        if (selectedAssessment?.assessment.topic) {
          doc.text(`Topik: ${selectedAssessment.assessment.topic}`, 12, yPos);
          yPos += 6;
        }
        doc.text(`Tarikh: ${new Date(selectedAssessment?.assessment.assessment_date!).toLocaleDateString('ms-MY')}`, 12, yPos);
        yPos += 12;

        // Table setup
        const col1Width = 15;  // BIL
        const col2Width = 80;  // NAMA MURID
        const col3Width = pageWidth - 24 - col1Width - col2Width; // TAHAP PENGUASAAN
        
        const col1X = 12;
        const col2X = col1X + col1Width;
        const col3X = col2X + col2Width;
        
        const headerHeight = 8;
        const rowHeight = 8;

        // Draw table header background
        doc.setFillColor(220, 220, 220);
        doc.rect(col1X, yPos - 6, col1Width, headerHeight, 'F');
        doc.rect(col2X, yPos - 6, col2Width, headerHeight, 'F');
        doc.rect(col3X, yPos - 6, col3Width, headerHeight, 'F');

        // Table headers
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('BIL', col1X + 2, yPos);
        doc.text('NAMA MURID', col2X + 2, yPos);
        doc.text('TAHAP PENGUASAAN', col3X + 2, yPos);

        // Draw header border
        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.rect(col1X, yPos - 6, col1Width, headerHeight);
        doc.rect(col2X, yPos - 6, col2Width, headerHeight);
        doc.rect(col3X, yPos - 6, col3Width, headerHeight);

        yPos += 10;

        // Student data
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        
        selectedAssessment?.students.forEach((student, index) => {
          // Check if we need a new page
          if (yPos > pageHeight - 20) {
            // Draw bottom border on current page
            doc.line(col1X, yPos - 2, col1X + col1Width + col2Width + col3Width, yPos - 2);
            
            doc.addPage();
            yPos = 15;
            
            // Repeat header on new page
            doc.setFillColor(220, 220, 220);
            doc.rect(col1X, yPos - 6, col1Width, headerHeight, 'F');
            doc.rect(col2X, yPos - 6, col2Width, headerHeight, 'F');
            doc.rect(col3X, yPos - 6, col3Width, headerHeight, 'F');
            
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(9);
            doc.text('BIL', col1X + 2, yPos);
            doc.text('NAMA MURID', col2X + 2, yPos);
            doc.text('TAHAP PENGUASAAN', col3X + 2, yPos);
            
            doc.setDrawColor(0);
            doc.setLineWidth(0.5);
            doc.rect(col1X, yPos - 6, col1Width, headerHeight);
            doc.rect(col2X, yPos - 6, col2Width, headerHeight);
            doc.rect(col3X, yPos - 6, col3Width, headerHeight);
            
            yPos += 10;
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(8);
          }

          const ratingText = student.rating_type || 'Belum dinilai';
          
          // Draw row borders
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.3);
          doc.line(col1X, yPos - 5, col1X, yPos + 3);  // Left border
          doc.line(col2X, yPos - 5, col2X, yPos + 3);  // Middle border 1
          doc.line(col3X, yPos - 5, col3X, yPos + 3);  // Middle border 2
          doc.line(col1X + col1Width + col2Width + col3Width, yPos - 5, col1X + col1Width + col2Width + col3Width, yPos + 3); // Right border
          
          doc.text(`${index + 1}`, col1X + 2, yPos);
          doc.text(student.name.substring(0, 35), col2X + 2, yPos); // Truncate long names
          doc.text(ratingText, col3X + 2, yPos);
          yPos += rowHeight;
        });

        // Draw bottom border
        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.line(col1X, yPos - 2, col1X + col1Width + col2Width + col3Width, yPos - 2);

        // Footer
        doc.setFontSize(7);
        doc.setFont('Helvetica', 'italic');
        doc.text(`Dijana pada: ${new Date().toLocaleString('ms-MY')}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

        doc.save(`penilaian-${selectedAssessment?.assessment.class_name}-${new Date().toISOString().split('T')[0]}.pdf`);
      } else if (format === 'csv') {
        // Export as CSV
        const endpoint = `/api/assessments/${assessmentId}/export/pdf`; // PDF endpoint returns CSV
        fetch(endpoint)
          .then(response => response.blob())
          .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `penilaian-${selectedAssessment?.assessment.class_name}-${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(link);
          })
          .catch(error => {
            console.error('Error exporting CSV:', error);
            alert('Gagal mengeksport penilaian');
          });
      }
    } catch (error) {
      console.error('Error exporting assessment:', error);
      alert('Gagal mengeksport penilaian');
    }
  };

  const handleDeleteAssessment = async (assessmentId: number) => {
    if (!confirm('Anda pasti ingin padam penilaian ini? Tindakan ini tidak boleh dibuat asal.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/assessments/${assessmentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (data.success) {
        alert('Penilaian berjaya dipadamkan');
        setSelectedAssessment(null);
        loadAssessments();
      } else {
        alert('Gagal padam: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting assessment:', error);
      alert('Gagal padam penilaian');
    } finally {
      setLoading(false);
    }
  };

  const handleManualAddStudent = async () => {
    if (!manualStudentName.trim() || !manualStudentClass) {
      alert('Sila lengkapkan semua maklumat');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/students-new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          students: [
            {
              name: manualStudentName.trim(),
              class_name: classes.find(c => c.id === parseInt(manualStudentClass))?.name || ''
            }
          ]
        }),
      });

      const data = await response.json();

      if (data.success && data.results.successCount > 0) {
        alert('Murid berjaya ditambah');
        setManualStudentName('');
        setManualStudentClass('');
        setShowManualAddStudentModal(false);
        loadStudents();
      } else {
        alert('Gagal tambah murid: ' + (data.results?.errors?.[0] || data.error));
      }
    } catch (error) {
      console.error('Error adding student:', error);
      alert('Gagal tambah murid');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="header">
        <h1>📚 Sistem Pengurusan Penilaian Murid</h1>
        <div className="header-actions">
          <div className="user-info">
            <span>👤 {currentUser}</span>
            <button onClick={handleLogout} className="logout-btn">
              🚪 Keluar
            </button>
          </div>
        </div>
        <div className="nav-tabs">
          <button
            className={`nav-tab ${activeTab === 'daftar' ? 'active' : ''}`}
            onClick={() => setActiveTab('daftar')}
          >
            👤 Daftar Murid
          </button>
          <button
            className={`nav-tab ${activeTab === 'penilaian' ? 'active' : ''}`}
            onClick={() => setActiveTab('penilaian')}
          >
            ⭐ Tambah Penilaian
          </button>
          <button
            className={`nav-tab ${activeTab === 'analisis' ? 'active' : ''}`}
            onClick={() => setActiveTab('analisis')}
          >
            📊 Analisis
          </button>
        </div>
      </div>

      <div className="main-content">
        {/* Page 1: Register Students */}
        {activeTab === 'daftar' && (
          <div>
            <div className="filters-section">
              <div className="form-group">
                <label>Pilih Kelas *</label>
                <select
                  value={selectedClass || ''}
                  onChange={(e) => setSelectedClass(e.target.value ? parseInt(e.target.value) : null)}
                >
                  <option value="">-- Pilih Kelas --</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="action-buttons">
              <button className="btn btn-primary" onClick={() => setShowBulkImportModal(true)}>
                📥 Import Murid (CSV)
              </button>
              <button className="btn btn-secondary" onClick={() => setShowManualAddStudentModal(true)}>
                ➕ Tambah Murid Baru
              </button>
            </div>

            {loading ? (
              <div className="empty-state">
                <h3>Memuatkan...</h3>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="students-table">
                  <thead>
                    <tr>
                      <th>BIL</th>
                      <th>NAMA MURID</th>
                      <th>KELAS</th>
                      <th>TINDAKAN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students
                      .filter(s => !selectedClass || s.class_id === selectedClass)
                      .map((student, index) => (
                        <tr key={student.id}>
                          <td>{index + 1}</td>
                          <td>{student.name}</td>
                          <td>{student.class_name}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                className="btn btn-sm btn-outline"
                                onClick={() => handleOpenEditStudent(student)}
                                style={{ padding: '5px 12px', fontSize: '12px' }}
                              >
                                ✏️ Edit
                              </button>
                              <button 
                                className="btn btn-sm btn-danger"
                                onClick={() => handleDeleteStudent(student)}
                                style={{ padding: '5px 12px', fontSize: '12px' }}
                              >
                                🗑️ Padam
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Page 2: Add Ratings */}
        {activeTab === 'penilaian' && (
          <div>
            <div className="filters-section">
              <div className="form-group">
                <label>Pilih Penilaian *</label>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      loadAssessmentDetail(parseInt(e.target.value));
                    } else {
                      setSelectedAssessment(null);
                    }
                  }}
                >
                  <option value="">-- Pilih Penilaian --</option>
                  {assessments.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.class_name} - {a.teacher_name} - {a.subject_name} ({new Date(a.assessment_date).toLocaleDateString('ms-MY')})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="action-buttons">
              <button className="btn btn-primary" onClick={() => setShowCreateAssessmentModal(true)}>
                ➕ Buat Penilaian Baru
              </button>
            </div>

            {selectedAssessment ? (
              <div>
                <div style={{ marginBottom: '20px', padding: '15px', background: '#f0f9ff', borderRadius: '8px' }}>
                  <h3>{selectedAssessment.assessment.class_name}</h3>
                  <p><strong>Guru:</strong> {selectedAssessment.assessment.teacher_name}</p>
                  <p><strong>Subjek:</strong> {selectedAssessment.assessment.subject_name}</p>
                  {selectedAssessment.assessment.topic && <p><strong>Topik:</strong> {selectedAssessment.assessment.topic}</p>}
                  <p><strong>Tarikh:</strong> {new Date(selectedAssessment.assessment.assessment_date).toLocaleDateString('ms-MY')}</p>
                  <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => exportAssessment(selectedAssessment.assessment.id, 'pdf')}
                      style={{ padding: '8px 16px', fontSize: '14px' }}
                    >
                      📄 Export PDF
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => exportAssessment(selectedAssessment.assessment.id, 'csv')}
                      style={{ padding: '8px 16px', fontSize: '14px' }}
                    >
                      📊 Export CSV
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDeleteAssessment(selectedAssessment.assessment.id)}
                      style={{ padding: '8px 16px', fontSize: '14px', marginLeft: 'auto' }}
                    >
                      🗑️ Padam Penilaian
                    </button>
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table className="students-table">
                    <thead>
                      <tr>
                        <th>BIL</th>
                        <th>NAMA MURID</th>
                        <th style={{ minWidth: '500px' }}>TAHAP PENGUASAAN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedAssessment.students.map((student, index) => (
                        <tr key={student.id}>
                          <td>{index + 1}</td>
                          <td><strong>{student.name}</strong></td>
                          <td>
                            <div className="tp-buttons">
                              {['TP1', 'TP2', 'TP3', 'TP4', 'TP5', 'TP6', 'TD'].map(tp => (
                                <button
                                  key={tp}
                                  className={`tp-btn ${tp.toLowerCase()} ${getRatingValue(student, tp) ? 'selected' : ''}`}
                                  onClick={() => handleRatingClick(student.id, tp, getRatingValue(student, tp))}
                                >
                                  {tp}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <h3>Sila pilih penilaian untuk mula</h3>
              </div>
            )}
          </div>
        )}

        {/* Page 3: Analytics */}
        {activeTab === 'analisis' && analytics && (
          <div>
            <div className="stats-grid">
              <div className="stat-card" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
                <h3>Jumlah Murid</h3>
                <div className="value">{analytics.totalStudents}</div>
              </div>
              <div className="stat-card" style={{ background: 'linear-gradient(135deg, #f093fb, #f5576c)' }}>
                <h3>Penilaian Dibuat</h3>
                <div className="value">{analytics.totalAssessments}</div>
              </div>
              <div className="stat-card" style={{ background: 'linear-gradient(135deg, #4facfe, #00f2fe)' }}>
                <h3>Kelas</h3>
                <div className="value">{analytics.uniqueClasses}</div>
              </div>
              <div className="stat-card" style={{ background: 'linear-gradient(135deg, #43e97b, #38f9d7)' }}>
                <h3>Guru</h3>
                <div className="value">{analytics.uniqueTeachers}</div>
              </div>
            </div>

            <div className="chart-container">
              <h3>📚 Murid Mengikut Kelas</h3>
              <div className="bar-chart">
                {Object.entries(analytics.byClass).map(([className, count]) => {
                  const maxValue = Math.max(...Object.values(analytics.byClass), 1);
                  return (
                    <div key={className} className="bar-item">
                      <div className="bar" style={{ height: `${(count / maxValue) * 100}%` }}>
                        <div className="bar-value">{count}</div>
                      </div>
                      <div className="bar-label">{className}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="chart-container">
              <h3>👨‍🏫 Penilaian Mengikut Guru</h3>
              <div className="bar-chart">
                {Object.entries(analytics.byTeacher).map(([teacher, count]) => {
                  const maxValue = Math.max(...Object.values(analytics.byTeacher), 1);
                  return (
                    <div key={teacher} className="bar-item">
                      <div className="bar" style={{ height: `${(count / maxValue) * 100}%` }}>
                        <div className="bar-value">{count}</div>
                      </div>
                      <div className="bar-label">{teacher}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Edit Student */}
      {showEditStudentModal && editingStudent && (
        <div className="modal-overlay" onClick={() => { setShowEditStudentModal(false); setEditingStudent(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Maklumat Murid</h2>
            <div className="form-group">
              <label>Nama Murid *</label>
              <input
                type="text"
                placeholder="Masukkan nama murid..."
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>Kelas *</label>
              <select
                value={editingClass}
                onChange={(e) => setEditingClass(e.target.value)}
                disabled={loading}
              >
                <option value="">-- Pilih Kelas --</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>
            <div className="modal-buttons">
              <button 
                className="btn btn-outline" 
                onClick={() => { setShowEditStudentModal(false); setEditingStudent(null); }}
                disabled={loading}
              >
                Batal
              </button>
              <button className="btn btn-primary" onClick={handleSaveEditStudent} disabled={loading}>
                {loading ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Bulk Import Students */}
      {showBulkImportModal && (
        <div className="modal-overlay" onClick={() => setShowBulkImportModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <h2>Import Murid (CSV)</h2>
            <p style={{ marginBottom: '15px', fontSize: '14px', color: '#666' }}>
              File CSV dengan 2 lajur: Nama Murid, Nama Kelas
            </p>
            <div className="form-group">
              <label>Pilih File CSV</label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setBulkImportFile(e.target.files?.[0] || null)}
                disabled={bulkImporting}
              />
            </div>
            <div style={{ marginBottom: '15px', padding: '10px', background: '#f0f9ff', borderRadius: '8px', fontSize: '12px' }}>
              <strong>Contoh CSV (tanpa header):</strong>
              <pre style={{ marginTop: '8px', whiteSpace: 'pre-wrap' }}>Ahmad Ali,1 TERBILANG
Siti Hassan,1 TERBILANG
Muthu Raman,2 CEMERLANG</pre>
            </div>
            <div className="modal-buttons">
              <button className="btn btn-outline" onClick={() => { setShowBulkImportModal(false); setBulkImportFile(null); }} disabled={bulkImporting}>
                Batal
              </button>
              <button className="btn btn-primary" onClick={handleBulkImportStudents} disabled={bulkImporting || !bulkImportFile}>
                {bulkImporting ? 'Mengimport...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Manual Add Student */}
      {showManualAddStudentModal && (
        <div className="modal-overlay" onClick={() => setShowManualAddStudentModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Tambah Murid Baru</h2>
            <div className="form-group">
              <label>Nama Murid *</label>
              <input
                type="text"
                placeholder="Masukkan nama murid..."
                value={manualStudentName}
                onChange={(e) => setManualStudentName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>Kelas *</label>
              <select
                value={manualStudentClass}
                onChange={(e) => setManualStudentClass(e.target.value)}
                disabled={loading}
              >
                <option value="">-- Pilih Kelas --</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>
            <div className="modal-buttons">
              <button 
                className="btn btn-outline" 
                onClick={() => { setShowManualAddStudentModal(false); setManualStudentName(''); setManualStudentClass(''); }}
                disabled={loading}
              >
                Batal
              </button>
              <button className="btn btn-primary" onClick={handleManualAddStudent} disabled={loading || !manualStudentName.trim() || !manualStudentClass}>
                {loading ? 'Menambah...' : 'Tambah'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Assessment */}
      {showCreateAssessmentModal && (
        <div className="modal-overlay" onClick={() => setShowCreateAssessmentModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Buat Penilaian Baru</h2>
            <div className="form-group">
              <label>Kelas *</label>
              <select
                value={newAssessment.class_id}
                onChange={(e) => setNewAssessment({ ...newAssessment, class_id: e.target.value })}
              >
                <option value="">-- Pilih Kelas --</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Nama Guru *</label>
              <input
                type="text"
                placeholder="Masukkan nama guru..."
                value={newAssessment.teacher_name}
                onChange={(e) => setNewAssessment({ ...newAssessment, teacher_name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Subjek *</label>
              <input
                type="text"
                placeholder="Masukkan subjek..."
                value={newAssessment.subject_name}
                onChange={(e) => setNewAssessment({ ...newAssessment, subject_name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Topik</label>
              <input
                type="text"
                placeholder="Masukkan topik (opsional)..."
                value={newAssessment.topic}
                onChange={(e) => setNewAssessment({ ...newAssessment, topic: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Tarikh *</label>
              <input
                type="date"
                value={newAssessment.assessment_date}
                onChange={(e) => setNewAssessment({ ...newAssessment, assessment_date: e.target.value })}
              />
            </div>
            <div className="modal-buttons">
              <button className="btn btn-outline" onClick={() => setShowCreateAssessmentModal(false)} disabled={loading}>
                Batal
              </button>
              <button className="btn btn-primary" onClick={handleCreateAssessment} disabled={loading}>
                {loading ? 'Membuat...' : 'Buat Penilaian'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

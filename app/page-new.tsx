'use client';

import { useState, useEffect } from 'react';
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
    ratings: Array<{ rating_type: string; is_selected: boolean }>;
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
    teacher_name: '',
    subject_name: '',
    topic: '',
    assessment_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadClasses();
    loadStudents();
    if (activeTab === 'penilaian') {
      loadAssessments();
    } else if (activeTab === 'analisis') {
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

  const handleBulkImportStudents = async () => {
    if (!bulkImportFile) {
      alert('Sila pilih file CSV');
      return;
    }

    if (!selectedClass) {
      alert('Sila pilih kelas');
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
          class_name: classes.find(c => c.id === selectedClass)?.name || '',
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
    if (!selectedClass || !newAssessment.teacher_name.trim() || !newAssessment.subject_name.trim() || !newAssessment.assessment_date.trim()) {
      alert('Sila lengkapkan semua maklumat');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: selectedClass,
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
      const response = await fetch('/api/ratings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          assessment_id: selectedAssessment.assessment.id,
          rating_type: ratingType,
          is_selected: !isCurrentlySelected,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Update UI
        setSelectedAssessment(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            students: prev.students.map(student => {
              if (student.id === studentId) {
                return {
                  ...student,
                  ratings: student.ratings.map(rating => {
                    if (rating.rating_type === ratingType) {
                      return { ...rating, is_selected: !isCurrentlySelected };
                    }
                    return { ...rating, is_selected: false };
                  }),
                };
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

  const getRatingValue = (ratings: any[], ratingType: string): boolean => {
    const rating = ratings.find(r => r.rating_type === ratingType);
    return rating?.is_selected || false;
  };

  return (
    <div className="app-container">
      <div className="header">
        <h1>📚 Sistem Pengurusan Penilaian Murid</h1>
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
                                  className={`tp-btn ${tp.toLowerCase()} ${getRatingValue(student.ratings, tp) ? 'selected' : ''}`}
                                  onClick={() => handleRatingClick(student.id, tp, getRatingValue(student.ratings, tp))}
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

      {/* Modal: Bulk Import Students */}
      {showBulkImportModal && (
        <div className="modal-overlay" onClick={() => setShowBulkImportModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <h2>Import Murid (CSV)</h2>
            <p style={{ marginBottom: '15px', fontSize: '14px', color: '#666' }}>
              File CSV dengan 1 lajur: Nama Murid (kelas akan diambil dari pilihan atas)
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
              <strong>Contoh CSV:</strong>
              <pre style={{ marginTop: '8px', whiteSpace: 'pre-wrap' }}>Ahmad Ali
Siti Hassan
Muthu Raman</pre>
            </div>
            <div className="modal-buttons">
              <button className="btn btn-outline" onClick={() => { setShowBulkImportModal(false); setBulkImportFile(null); }} disabled={bulkImporting}>
                Batal
              </button>
              <button className="btn btn-primary" onClick={handleBulkImportStudents} disabled={bulkImporting || !bulkImportFile || !selectedClass}>
                {bulkImporting ? 'Mengimport...' : 'Import'}
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

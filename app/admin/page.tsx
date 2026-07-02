'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import '../globals.css';

interface Teacher {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  created_at: string;
}

interface Subject {
  id: number;
  name: string;
  description?: string;
  created_at: string;
}

interface Student {
  id: number;
  name: string;
  class_id: number;
  class_name: string;
}

interface Class {
  id: number;
  name: string;
  description?: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'students' | 'classes' | 'teachers' | 'subjects'>('students');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [newTeacher, setNewTeacher] = useState({ name: '', email: '', phone: '' });
  const [newSubject, setNewSubject] = useState({ name: '', description: '' });
  const [newStudent, setNewStudent] = useState({ name: '', class_id: '' });
  const [newClass, setNewClass] = useState({ name: '', description: '' });
  
  // Filter states
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  
  // Bulk import
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [bulkImportFile, setBulkImportFile] = useState<File | null>(null);
  const [bulkImporting, setBulkImporting] = useState(false);

  // Edit states
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [editingClass, setEditingClass] = useState<string>('');

  // Edit teacher states
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [showEditTeacherModal, setShowEditTeacherModal] = useState(false);
  const [editTeacherForm, setEditTeacherForm] = useState({ name: '', email: '', phone: '' });

  // Edit subject states
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [showEditSubjectModal, setShowEditSubjectModal] = useState(false);
  const [editSubjectForm, setEditSubjectForm] = useState({ name: '', description: '' });

  // Edit class states
  const [editingClassObj, setEditingClassObj] = useState<Class | null>(null);
  const [showEditClassModal, setShowEditClassModal] = useState(false);
  const [editClassForm, setEditClassForm] = useState({ name: '', description: '' });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = () => {
    loadTeachers();
    loadSubjects();
    loadStudents();
    loadClasses();
  };

  const loadTeachers = async () => {
    try {
      const response = await fetch('/api/teachers');
      const data = await response.json();
      if (data.success) {
        setTeachers(data.data);
      }
    } catch (error) {
      console.error('Error loading teachers:', error);
    }
  };

  const loadSubjects = async () => {
    try {
      const response = await fetch('/api/subjects');
      const data = await response.json();
      if (data.success) {
        setSubjects(data.data);
      }
    } catch (error) {
      console.error('Error loading subjects:', error);
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

  const handleAddTeacher = async () => {
    if (!newTeacher.name.trim()) {
      alert('Sila masukkan nama guru');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTeacher),
      });

      const data = await response.json();
      if (data.success) {
        alert('Guru berjaya ditambah');
        setNewTeacher({ name: '', email: '', phone: '' });
        loadTeachers();
      } else {
        alert('Gagal tambah guru: ' + data.error);
      }
    } catch (error) {
      console.error('Error adding teacher:', error);
      alert('Gagal tambah guru');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubject = async () => {
    if (!newSubject.name.trim()) {
      alert('Sila masukkan nama subjek');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSubject),
      });

      const data = await response.json();
      if (data.success) {
        alert('Subjek berjaya ditambah');
        setNewSubject({ name: '', description: '' });
        loadSubjects();
      } else {
        alert('Gagal tambah subjek: ' + data.error);
      }
    } catch (error) {
      console.error('Error adding subject:', error);
      alert('Gagal tambah subjek');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async () => {
    if (!newStudent.name.trim() || !newStudent.class_id) {
      alert('Sila masukkan nama murid dan kelas');
      return;
    }

    setLoading(true);
    try {
      const selectedClassData = classes.find(c => c.id === parseInt(newStudent.class_id));
      const response = await fetch('/api/students-new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          students: [{
            name: newStudent.name.trim(),
            class_name: selectedClassData?.name || '',
          }],
        }),
      });

      const data = await response.json();
      if (data.success && data.results?.successCount > 0) {
        alert('Murid berjaya ditambah');
        setNewStudent({ name: '', class_id: '' });
        loadStudents();
      } else {
        const err = data.results?.errors?.[0] || data.error || '';
        if (err.includes('already exists')) {
          alert('Murid ini sudah wujud dalam kelas tersebut');
        } else {
          alert('Gagal tambah murid: ' + (err || 'Ralat tidak diketahui'));
        }
      }
    } catch (error) {
      console.error('Error adding student:', error);
      alert('Gagal tambah murid');
    } finally {
      setLoading(false);
    }
  };

  const handleAddClass = async () => {
    if (!newClass.name.trim()) {
      alert('Sila masukkan nama kelas');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newClass.name.trim(), description: newClass.description.trim() }),
      });

      const data = await response.json();
      if (data.success) {
        alert('Kelas berjaya ditambah');
        setNewClass({ name: '', description: '' });
        loadClasses();
      } else {
        alert('Gagal tambah kelas: ' + data.error);
      }
    } catch (error) {
      console.error('Error adding class:', error);
      alert('Gagal tambah kelas');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const content = 'Ahmad Bin Ali,1A\nSiti Binti Abu,1A\nChong Wei Ming,2B\n';
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'templat-murid.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleBulkImport = async () => {
    if (!bulkImportFile) {
      alert('Sila pilih fail CSV');
      return;
    }

    setBulkImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', bulkImportFile);

      const response = await fetch('/api/students/bulk', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        alert(`Berjaya import ${data.data.imported} murid!`);
        setBulkImportFile(null);
        setShowBulkImportModal(false);
        loadStudents();
        loadClasses();
      } else {
        alert('Gagal import: ' + data.error);
      }
    } catch (error) {
      console.error('Error bulk importing:', error);
      alert('Gagal import murid');
    } finally {
      setBulkImporting(false);
    }
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
        alert('Murid berjaya dikemaskini');
        setShowEditStudentModal(false);
        setEditingStudent(null);
        loadStudents();
      } else {
        const err = data.error || '';
        if (err.includes('already exists')) {
          alert('Murid dengan nama ini sudah wujud dalam kelas tersebut');
        } else {
          alert('Gagal kemaskini: ' + (err || 'Ralat tidak diketahui'));
        }
      }
    } catch (error) {
      console.error('Error updating student:', error);
      alert('Gagal kemaskini murid');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (student: Student) => {
    if (!confirm(`Anda pasti ingin padam ${student.name}?`)) {
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

  // Teacher handlers
  const handleOpenEditTeacher = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setEditTeacherForm({ name: teacher.name, email: teacher.email || '', phone: teacher.phone || '' });
    setShowEditTeacherModal(true);
  };

  const handleSaveEditTeacher = async () => {
    if (!editingTeacher || !editTeacherForm.name.trim()) {
      alert('Sila masukkan nama guru');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/teachers/${editingTeacher.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editTeacherForm),
      });

      const data = await response.json();

      if (data.success) {
        alert('Guru berjaya dikemaskini');
        setShowEditTeacherModal(false);
        setEditingTeacher(null);
        loadTeachers();
      } else {
        alert('Gagal kemaskini: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating teacher:', error);
      alert('Gagal kemaskini guru');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeacher = async (teacher: Teacher) => {
    if (!confirm(`Anda pasti ingin padam ${teacher.name}?`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/teachers/${teacher.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (data.success) {
        alert('Guru berjaya dipadamkan');
        loadTeachers();
      } else {
        alert('Gagal padam: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting teacher:', error);
      alert('Gagal padam guru');
    } finally {
      setLoading(false);
    }
  };

  // Subject handlers
  const handleOpenEditSubject = (subject: Subject) => {
    setEditingSubject(subject);
    setEditSubjectForm({ name: subject.name, description: subject.description || '' });
    setShowEditSubjectModal(true);
  };

  const handleSaveEditSubject = async () => {
    if (!editingSubject || !editSubjectForm.name.trim()) {
      alert('Sila masukkan nama subjek');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/subjects/${editingSubject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editSubjectForm),
      });

      const data = await response.json();

      if (data.success) {
        alert('Subjek berjaya dikemaskini');
        setShowEditSubjectModal(false);
        setEditingSubject(null);
        loadSubjects();
      } else {
        alert('Gagal kemaskini: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating subject:', error);
      alert('Gagal kemaskini subjek');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubject = async (subject: Subject) => {
    if (!confirm(`Anda pasti ingin padam ${subject.name}?`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/subjects/${subject.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (data.success) {
        alert('Subjek berjaya dipadamkan');
        loadSubjects();
      } else {
        alert('Gagal padam: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting subject:', error);
      alert('Gagal padam subjek');
    } finally {
      setLoading(false);
    }
  };

  // Class handlers
  const handleOpenEditClass = (cls: Class) => {
    setEditingClassObj(cls);
    setEditClassForm({ name: cls.name, description: cls.description || '' });
    setShowEditClassModal(true);
  };

  const handleSaveEditClass = async () => {
    if (!editingClassObj || !editClassForm.name.trim()) {
      alert('Sila masukkan nama kelas');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/classes/${editingClassObj.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editClassForm),
      });

      const data = await response.json();

      if (data.success) {
        alert('Kelas berjaya dikemaskini');
        setShowEditClassModal(false);
        setEditingClassObj(null);
        loadClasses();
      } else {
        alert('Gagal kemaskini: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating class:', error);
      alert('Gagal kemaskini kelas');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClass = async (cls: Class) => {
    const studentCount = students.filter(s => s.class_id === cls.id).length;
    if (studentCount > 0) {
      if (!confirm(`Kelas ${cls.name} mempunyai ${studentCount} murid. Padam kelas akan padam semua murid dalam kelas ini. Teruskan?`)) {
        return;
      }
    } else {
      if (!confirm(`Anda pasti ingin padam ${cls.name}?`)) {
        return;
      }
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/classes/${cls.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (data.success) {
        alert('Kelas berjaya dipadamkan');
        loadClasses();
        loadStudents();
      } else {
        alert('Gagal padam: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting class:', error);
      alert('Gagal padam kelas');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const filteredStudents = students.filter(s =>
    (!selectedClass || s.class_id === selectedClass) &&
    (!studentSearch.trim() || s.name.toLowerCase().includes(studentSearch.trim().toLowerCase()))
  );

  return (
    <div className="app-container">
      <div className="header">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          marginBottom: '1rem'
        }}>
          <img 
            src="/logo.png" 
            alt="SK Taman Jasmin Logo" 
            style={{
              width: '80px',
              height: '80px',
              objectFit: 'contain'
            }}
          />
          <div>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: 'var(--primary)',
              margin: '0 0 0.25rem 0'
            }}>
              Sekolah Kebangsaan Taman Jasmin
            </h2>
            <h1>⚙️ Admin - Pengurusan Data</h1>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => router.push('/dashboard')}>
            ← Kembali
          </button>
          <button className="btn btn-outline" onClick={handleLogout}>
            🚪 Keluar
          </button>
        </div>
        <div className="nav-tabs">
          <button className={`nav-tab ${activeTab === 'students' ? 'active' : ''}`} onClick={() => setActiveTab('students')}>
            👤 Daftar Murid
          </button>
          <button className={`nav-tab ${activeTab === 'classes' ? 'active' : ''}`} onClick={() => setActiveTab('classes')}>
            🏫 Kelas
          </button>
          <button className={`nav-tab ${activeTab === 'teachers' ? 'active' : ''}`} onClick={() => setActiveTab('teachers')}>
            👨‍🏫 Guru
          </button>
          <button className={`nav-tab ${activeTab === 'subjects' ? 'active' : ''}`} onClick={() => setActiveTab('subjects')}>
            📚 Subjek
          </button>
        </div>
      </div>

      <div className="main-content">
        {/* STUDENTS TAB */}
        {activeTab === 'students' && (
          <div>
            <div className="stats-row" style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              <div className="stat-card" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', padding: '20px', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Jumlah Murid</h4>
                <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{students.length}</div>
              </div>
              <div className="stat-card" style={{ background: 'linear-gradient(135deg, #4facfe, #00f2fe)', color: 'white', padding: '20px', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Jumlah Kelas</h4>
                <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{classes.length}</div>
              </div>
            </div>

            <div className="add-entry-box">
              <h3>Tambah Murid Baru</h3>
              <div className="form-grid cols-3">
                <input
                  type="text"
                  className="enhanced-input"
                  placeholder="Nama murid..."
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !loading) handleAddStudent(); }}
                  disabled={loading}
                />
                <select
                  className="enhanced-select"
                  value={newStudent.class_id}
                  onChange={(e) => setNewStudent({ ...newStudent, class_id: e.target.value })}
                  disabled={loading}
                >
                  <option value="">-- Pilih Kelas --</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
                <button className="btn btn-primary" onClick={handleAddStudent} disabled={loading}>
                  ➕ Tambah
                </button>
              </div>
            </div>

            <div className="action-buttons" style={{ marginBottom: '20px' }}>
              <button className="btn btn-secondary" onClick={() => setShowBulkImportModal(true)}>
                📥 Import CSV
              </button>
              <div style={{ flex: 1 }} />
              <input
                type="text"
                placeholder="🔍 Cari nama murid..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', minWidth: '200px' }}
              />
              <select
                value={selectedClass || ''}
                onChange={(e) => setSelectedClass(e.target.value ? parseInt(e.target.value) : null)}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc' }}
              >
                <option value="">Semua Kelas</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>

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
                  {filteredStudents.map((student, index) => (
                    <tr key={student.id}>
                      <td>{index + 1}</td>
                      <td>{student.name}</td>
                      <td>{student.class_name}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-sm btn-outline" onClick={() => handleOpenEditStudent(student)}>
                            ✏️ Edit
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDeleteStudent(student)}>
                            🗑️ Padam
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>
                        Tiada murid dijumpai.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CLASSES TAB */}
        {activeTab === 'classes' && (
          <div>
            <div className="add-entry-box">
              <h3>Tambah Kelas Baru</h3>
              <div className="form-grid cols-3-wide">
                <input
                  type="text"
                  className="enhanced-input"
                  placeholder="Nama kelas (contoh: 1A, 2B)..."
                  value={newClass.name}
                  onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                  disabled={loading}
                />
                <input
                  type="text"
                  className="enhanced-input"
                  placeholder="Penerangan..."
                  value={newClass.description}
                  onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
                  disabled={loading}
                />
                <button className="btn btn-primary" onClick={handleAddClass} disabled={loading}>
                  ➕ Tambah
                </button>
              </div>
            </div>

            <h3>Senarai Kelas ({classes.length})</h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="students-table">
                <thead>
                  <tr>
                    <th>BIL</th>
                    <th>NAMA KELAS</th>
                    <th>PENERANGAN</th>
                    <th>BILANGAN MURID</th>
                    <th>TINDAKAN</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((cls, index) => (
                    <tr key={cls.id}>
                      <td>{index + 1}</td>
                      <td><strong>{cls.name}</strong></td>
                      <td>{cls.description || '-'}</td>
                      <td>{students.filter(s => s.class_id === cls.id).length}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-sm btn-outline" onClick={() => handleOpenEditClass(cls)}>
                            ✏️ Edit
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDeleteClass(cls)}>
                            🗑️ Padam
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {classes.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>
                        Tiada kelas dijumpai. Tambah kelas baru di atas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TEACHERS TAB */}
        {activeTab === 'teachers' && (
          <div>
            <div className="add-entry-box">
              <h3>Tambah Guru Baru</h3>
              <div className="form-grid cols-4">
                <input
                  type="text"
                  className="enhanced-input"
                  placeholder="Nama guru..."
                  value={newTeacher.name}
                  onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
                  disabled={loading}
                />
                <input
                  type="email"
                  className="enhanced-input"
                  placeholder="Email..."
                  value={newTeacher.email}
                  onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                  disabled={loading}
                />
                <input
                  type="tel"
                  className="enhanced-input"
                  placeholder="No. Telefon..."
                  value={newTeacher.phone}
                  onChange={(e) => setNewTeacher({ ...newTeacher, phone: e.target.value })}
                  disabled={loading}
                />
                <button className="btn btn-primary" onClick={handleAddTeacher} disabled={loading}>
                  ➕ Tambah
                </button>
              </div>
            </div>

            <h3>Senarai Guru ({teachers.length})</h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="students-table">
                <thead>
                  <tr>
                    <th>BIL</th>
                    <th>NAMA GURU</th>
                    <th>EMAIL</th>
                    <th>NO. TELEFON</th>
                    <th>TARIKH DITAMBAH</th>
                    <th>TINDAKAN</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((teacher, index) => (
                    <tr key={teacher.id}>
                      <td>{index + 1}</td>
                      <td><strong>{teacher.name}</strong></td>
                      <td>{teacher.email || '-'}</td>
                      <td>{teacher.phone || '-'}</td>
                      <td>{new Date(teacher.created_at).toLocaleDateString('ms-MY')}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-sm btn-outline" onClick={() => handleOpenEditTeacher(teacher)}>
                            ✏️ Edit
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDeleteTeacher(teacher)}>
                            🗑️ Padam
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {teachers.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>
                        Tiada guru dijumpai. Tambah guru baru di atas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUBJECTS TAB */}
        {activeTab === 'subjects' && (
          <div>
            <div className="add-entry-box">
              <h3>Tambah Subjek Baru</h3>
              <div className="form-grid cols-3-wide">
                <input
                  type="text"
                  className="enhanced-input"
                  placeholder="Nama subjek..."
                  value={newSubject.name}
                  onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                  disabled={loading}
                />
                <input
                  type="text"
                  className="enhanced-input"
                  placeholder="Penerangan..."
                  value={newSubject.description}
                  onChange={(e) => setNewSubject({ ...newSubject, description: e.target.value })}
                  disabled={loading}
                />
                <button className="btn btn-primary" onClick={handleAddSubject} disabled={loading}>
                  ➕ Tambah
                </button>
              </div>
            </div>

            <h3>Senarai Subjek ({subjects.length})</h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="students-table">
                <thead>
                  <tr>
                    <th>BIL</th>
                    <th>NAMA SUBJEK</th>
                    <th>PENERANGAN</th>
                    <th>TARIKH DITAMBAH</th>
                    <th>TINDAKAN</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((subject, index) => (
                    <tr key={subject.id}>
                      <td>{index + 1}</td>
                      <td><strong>{subject.name}</strong></td>
                      <td>{subject.description || '-'}</td>
                      <td>{new Date(subject.created_at).toLocaleDateString('ms-MY')}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-sm btn-outline" onClick={() => handleOpenEditSubject(subject)}>
                            ✏️ Edit
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDeleteSubject(subject)}>
                            🗑️ Padam
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {subjects.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>
                        Tiada subjek dijumpai. Tambah subjek baru di atas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Import Modal */}
      {showBulkImportModal && (
        <div className="modal-overlay" onClick={() => !bulkImporting && setShowBulkImportModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Import Murid (CSV)</h2>
            <p>Format CSV: nama_murid,kelas (tanpa baris tajuk)</p>
            <p style={{ fontSize: '0.9em', color: '#666' }}>Contoh: Ahmad Bin Ali,1A</p>
            <div style={{ margin: '12px 0' }}>
              <button className="btn btn-outline btn-sm" onClick={handleDownloadTemplate} disabled={bulkImporting}>
                ⬇️ Muat Turun Templat CSV
              </button>
            </div>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setBulkImportFile(e.target.files?.[0] || null)}
              disabled={bulkImporting}
            />
            <div className="modal-buttons">
              <button className="btn btn-outline" onClick={() => setShowBulkImportModal(false)} disabled={bulkImporting}>
                Batal
              </button>
              <button className="btn btn-primary" onClick={handleBulkImport} disabled={bulkImporting}>
                {bulkImporting ? 'Mengimport...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {showEditStudentModal && editingStudent && (
        <div className="modal-overlay" onClick={() => !loading && setShowEditStudentModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Murid</h2>
            <div className="form-group">
              <label>Nama Murid *</label>
              <input
                type="text"
                placeholder="Nama murid..."
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
              <button className="btn btn-outline" onClick={() => { setShowEditStudentModal(false); setEditingStudent(null); }} disabled={loading}>
                Batal
              </button>
              <button className="btn btn-primary" onClick={handleSaveEditStudent} disabled={loading}>
                {loading ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Teacher Modal */}
      {showEditTeacherModal && editingTeacher && (
        <div className="modal-overlay" onClick={() => !loading && setShowEditTeacherModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Guru</h2>
            <div className="form-group">
              <label>Nama Guru *</label>
              <input
                type="text"
                placeholder="Nama guru..."
                value={editTeacherForm.name}
                onChange={(e) => setEditTeacherForm({ ...editTeacherForm, name: e.target.value })}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="Email..."
                value={editTeacherForm.email}
                onChange={(e) => setEditTeacherForm({ ...editTeacherForm, email: e.target.value })}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>No. Telefon</label>
              <input
                type="tel"
                placeholder="No. Telefon..."
                value={editTeacherForm.phone}
                onChange={(e) => setEditTeacherForm({ ...editTeacherForm, phone: e.target.value })}
                disabled={loading}
              />
            </div>
            <div className="modal-buttons">
              <button className="btn btn-outline" onClick={() => { setShowEditTeacherModal(false); setEditingTeacher(null); }} disabled={loading}>
                Batal
              </button>
              <button className="btn btn-primary" onClick={handleSaveEditTeacher} disabled={loading}>
                {loading ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Subject Modal */}
      {showEditSubjectModal && editingSubject && (
        <div className="modal-overlay" onClick={() => !loading && setShowEditSubjectModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Subjek</h2>
            <div className="form-group">
              <label>Nama Subjek *</label>
              <input
                type="text"
                placeholder="Nama subjek..."
                value={editSubjectForm.name}
                onChange={(e) => setEditSubjectForm({ ...editSubjectForm, name: e.target.value })}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>Penerangan</label>
              <input
                type="text"
                placeholder="Penerangan..."
                value={editSubjectForm.description}
                onChange={(e) => setEditSubjectForm({ ...editSubjectForm, description: e.target.value })}
                disabled={loading}
              />
            </div>
            <div className="modal-buttons">
              <button className="btn btn-outline" onClick={() => { setShowEditSubjectModal(false); setEditingSubject(null); }} disabled={loading}>
                Batal
              </button>
              <button className="btn btn-primary" onClick={handleSaveEditSubject} disabled={loading}>
                {loading ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Class Modal */}
      {showEditClassModal && editingClassObj && (
        <div className="modal-overlay" onClick={() => !loading && setShowEditClassModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Kelas</h2>
            <div className="form-group">
              <label>Nama Kelas *</label>
              <input
                type="text"
                placeholder="Nama kelas..."
                value={editClassForm.name}
                onChange={(e) => setEditClassForm({ ...editClassForm, name: e.target.value })}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>Penerangan</label>
              <input
                type="text"
                placeholder="Penerangan..."
                value={editClassForm.description}
                onChange={(e) => setEditClassForm({ ...editClassForm, description: e.target.value })}
                disabled={loading}
              />
            </div>
            <div className="modal-buttons">
              <button className="btn btn-outline" onClick={() => { setShowEditClassModal(false); setEditingClassObj(null); }} disabled={loading}>
                Batal
              </button>
              <button className="btn btn-primary" onClick={handleSaveEditClass} disabled={loading}>
                {loading ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

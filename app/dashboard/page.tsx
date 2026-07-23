'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import '../globals.css';

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
  subtopics: Array<{ id: number; name: string }>;
  students: Array<{
    id: number;
    name: string;
    class_id: number;
    ratings: Array<{ rating_type: string | null; subtopic_id?: number }>;
    averageRating?: string | null;
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

const TP_LEVELS = ['TP1', 'TP2', 'TP3', 'TP4', 'TP5', 'TP6', 'TD'] as const;

const TP_INFO: Record<string, string> = {
  TP1: 'Tahu',
  TP2: 'Tahu dan Faham',
  TP3: 'Tahu, Faham dan Boleh Buat',
  TP4: 'Tahu, Faham dan Boleh Buat dengan Beradab',
  TP5: 'Boleh Buat dengan Beradab Terpuji',
  TP6: 'Boleh Buat dengan Beradab Mithali',
  TD: 'Tidak Dinilai',
};

// Binary mastery scale used for subtopic ratings and direct (no-subtopic) ratings.
const MASTERY_LEVELS = ['M', 'TM'] as const;

const MASTERY_INFO: Record<string, string> = {
  M: 'Menguasai',
  TM: 'Tidak Menguasai',
};

// Maps any stored rating code to its display label: binary codes become
// Menguasai / Tidak Menguasai; TP levels pass through unchanged.
const ratingLabel = (code: string | null | undefined): string =>
  code ? (MASTERY_INFO[code] || code) : '';

export default function Home() {
  const router = useRouter();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'penilaian' | 'analisis'>('penilaian');
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<Array<{ id: number; name: string }>>([]);
  const [subjects, setSubjects] = useState<Array<{ id: number; name: string }>>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<AssessmentDetail | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateAssessmentModal, setShowCreateAssessmentModal] = useState(false);
  const [newAssessment, setNewAssessment] = useState({
    class_id: '',
    teacher_id: '',
    subject_id: '',
    topic: '',
    assessment_date: new Date().toISOString().split('T')[0],
    subtopics: [''] as string[],
  });
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingModalStudent, setRatingModalStudent] = useState<any>(null);
  const [subtopicsForRating, setSubtopicsForRating] = useState<Array<{ id: number; name: string }>>([]);
  const [subtopicRatings, setSubtopicRatings] = useState<Record<number, string | null>>({});
  const [currentUser, setCurrentUser] = useState<string>('');
  const [showEditAssessmentModal, setShowEditAssessmentModal] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<any>(null);
  const [gradeSearch, setGradeSearch] = useState('');
  const [showUnratedOnly, setShowUnratedOnly] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setCurrentUser(session.user.name || session.user.email || '');
    }
  }, [session]);

  useEffect(() => {
    loadClasses();
    loadStudents();
    loadTeachers();
    loadSubjects();
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
        // averageRating (the overall/PURATA) is now teacher-editable and comes
        // straight from the API — no client-side formula.
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
    await signOut({ callbackUrl: '/login' });
  };

  const handleCreateAssessment = async () => {
    if (!newAssessment.class_id || !newAssessment.subject_id || !newAssessment.assessment_date.trim()) {
      alert('Sila lengkapkan semua maklumat');
      return;
    }

    setLoading(true);
    try {
      // Filter out empty subtopics
      const filteredSubtopics = newAssessment.subtopics.filter(st => st.trim());

      const response = await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: parseInt(newAssessment.class_id, 10),
          subject_id: parseInt(newAssessment.subject_id, 10),
          topic: newAssessment.topic,
          assessment_date: newAssessment.assessment_date,
          subtopics: filteredSubtopics.length > 0 ? filteredSubtopics : null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Penilaian berjaya dibuat');
        setNewAssessment({
          class_id: '',
          teacher_id: '',
          subject_id: '',
          topic: '',
          assessment_date: new Date().toISOString().split('T')[0],
          subtopics: [''],
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

  const handleRatingClick = async (studentId: number, student: any) => {
    if (!selectedAssessment) return;

    // If there are subtopics, open modal for rating subtopics
    if (selectedAssessment.subtopics && selectedAssessment.subtopics.length > 0) {
      setRatingModalStudent({ ...student, id: studentId });
      setSubtopicsForRating(selectedAssessment.subtopics);
      
      // Initialize subtopic ratings from existing ratings
      const ratings: Record<number, string | null> = {};
      selectedAssessment.subtopics.forEach(subtopic => {
        const studentRatings = student.ratings || [];
        const subtopicRating = studentRatings.find((r: any) => r.subtopic_id === subtopic.id);
        ratings[subtopic.id] = subtopicRating?.rating_type || null;
      });
      setSubtopicRatings(ratings);
      setShowRatingModal(true);
    }
  };

  const handleDirectRatingClick = async (studentId: number, ratingType: string, isCurrentlySelected: boolean) => {
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
          subtopic_id: null,
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
                return { 
                  ...student, 
                  ratings: [{ rating_type: newValue }],
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

  // Sets the teacher-editable overall (PURATA) TP level for a subtopic-based
  // assessment. Stored in the subtopic_id IS NULL rating row.
  const handleOverallRatingClick = async (studentId: number, ratingType: string, isCurrentlySelected: boolean) => {
    if (!selectedAssessment) return;

    try {
      const newValue = isCurrentlySelected ? null : ratingType;

      const response = await fetch('/api/ratings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          assessment_id: selectedAssessment.assessment.id,
          subtopic_id: null,
          rating_type: newValue,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSelectedAssessment(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            students: prev.students.map(student =>
              student.id === studentId ? { ...student, averageRating: newValue } : student
            ),
          };
        });
      } else {
        alert('Gagal kemaskini purata');
      }
    } catch (error) {
      console.error('Error updating overall rating:', error);
      alert('Gagal kemaskini purata');
    }
  };

  const handleSubtopicRatingChange = (subtopicId: number, ratingType: string | null) => {
    setSubtopicRatings(prev => ({
      ...prev,
      [subtopicId]: prev[subtopicId] === ratingType ? null : ratingType,
    }));
  };

  const handleCloseRatingModal = async () => {
    if (!selectedAssessment || !ratingModalStudent) return;

    setLoading(true);
    try {
      // Save all subtopic ratings
      for (const subtopicId of Object.keys(subtopicRatings)) {
        const ratingType = subtopicRatings[parseInt(subtopicId)];
        await fetch('/api/ratings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_id: ratingModalStudent.id,
            assessment_id: selectedAssessment.assessment.id,
            subtopic_id: parseInt(subtopicId),
            rating_type: ratingType,
          }),
        });
      }

      // Update the student's subtopic ratings in the UI. The overall (PURATA) is
      // set separately by the teacher, so it is preserved here as-is.
      setSelectedAssessment(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          students: prev.students.map(s => {
            if (s.id === ratingModalStudent.id) {
              // Update with the new subtopic ratings
              const updatedRatings = selectedAssessment.subtopics.map(subtopic => ({
                subtopic_id: subtopic.id,
                rating_type: subtopicRatings[subtopic.id] || null,
              }));

              return {
                ...s,
                ratings: updatedRatings,
              };
            }
            return s;
          }),
        };
      });

      setShowRatingModal(false);
      setRatingModalStudent(null);
      setSubtopicRatings({});
    } catch (error) {
      console.error('Error saving ratings:', error);
      alert('Gagal menyimpan penilaian');
    } finally {
      setLoading(false);
    }
  };



  const exportAssessment = async (assessmentId: number, format: 'pdf' | 'csv') => {
    try {
      if (format === 'pdf') {
        // Generate PDF using html2canvas for proper Arabic/Jawi font support
        // Create a hidden container with the assessment table
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.style.width = '1200px';
        container.style.background = 'white';
        container.style.padding = '40px';
        container.style.fontFamily = 'Arial, sans-serif';

        // Get subtopics
        const subtopics = selectedAssessment?.subtopics || [];
        const hasSubtopics = subtopics.length > 0;

        // Build HTML content
        let htmlContent = `
          <div style="font-family: Arial, 'Noto Sans Arabic', sans-serif;">
            <h1 style="text-align: center; font-size: 24px; margin-bottom: 20px; font-weight: bold;">
              REKOD PERKEMBANGAN MURID
            </h1>
            <div style="margin-bottom: 20px; font-size: 14px; line-height: 1.8;">
              <p><strong>Kelas:</strong> ${selectedAssessment?.assessment.class_name}</p>
              <p><strong>Guru:</strong> ${selectedAssessment?.assessment.teacher_name || 'Tidak Ditentukan'}</p>
              <p><strong>Subjek:</strong> ${selectedAssessment?.assessment.subject_name || 'Tidak Ditentukan'}</p>
              ${selectedAssessment?.assessment.topic ? `<p><strong>Topik:</strong> ${selectedAssessment.assessment.topic}</p>` : ''}
              <p><strong>Tarikh:</strong> ${new Date(selectedAssessment?.assessment.assessment_date!).toLocaleDateString('ms-MY')}</p>
            </div>`;

        // Legend for subtopics
        if (hasSubtopics && subtopics.length > 0) {
          htmlContent += `
            <div style="margin-bottom: 20px; padding: 15px; background: #f3f4f6; border-radius: 8px;">
              <h3 style="font-size: 14px; font-weight: bold; margin-bottom: 10px;">Standard Pembelajaran:</h3>
              <div style="font-size: 12px; line-height: 1.6;">`;
          
          subtopics.forEach((st: any, idx: number) => {
            htmlContent += `<p style="margin: 4px 0;"><strong>SP${idx + 1}:</strong> ${st.name}</p>`;
          });
          
          htmlContent += `
              </div>
            </div>`;
        }

        // Table
        htmlContent += `
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 20px;">
            <thead>
              <tr style="background: #e5e7eb;">
                <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left; font-weight: bold;">BIL</th>
                <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left; font-weight: bold;">NAMA MURID</th>`;
        
        if (hasSubtopics) {
          subtopics.forEach((st: any, idx: number) => {
            htmlContent += `<th style="border: 1px solid #d1d5db; padding: 10px; text-align: center; font-weight: bold;">SP${idx + 1}</th>`;
          });
        }
        
        htmlContent += `
                <th style="border: 1px solid #d1d5db; padding: 10px; text-align: center; font-weight: bold;">PURATA</th>
              </tr>
            </thead>
            <tbody>`;

        // Rating colour mapping (TP levels only). Binary mastery codes (M / TM)
        // are intentionally absent so they print with no background colour.
        const tpColors: { [key: string]: string } = {
          'TP1': '#dc2626',
          'TP2': '#f97316',
          'TP3': '#facc15',
          'TP4': '#84cc16',
          'TP5': '#22c55e',
          'TP6': '#3b82f6',
          'TD': '#9ca3af',
        };

        // Student rows
        selectedAssessment?.students.forEach((student, index) => {
          htmlContent += `
            <tr>
              <td style="border: 1px solid #d1d5db; padding: 8px;">${index + 1}</td>
              <td style="border: 1px solid #d1d5db; padding: 8px;">${student.name}</td>`;
          
          if (hasSubtopics) {
            subtopics.forEach((subtopic: any) => {
              const rating = student.ratings?.find((r: any) => r.subtopic_id === subtopic.id);
              const ratingCode = rating?.rating_type || null;
              const bgColor = (ratingCode && tpColors[ratingCode]) || '#ffffff';
              const cellText = ratingCode ? ratingLabel(ratingCode) : 'Tidak Dinilai';
              // White text only reads on a coloured cell; uncoloured ratings use dark text.
              const cellColor = ratingCode
                ? (tpColors[ratingCode] ? 'white' : '#111827')
                : '#6b7280';

              htmlContent += `
                <td style="border: 1px solid #d1d5db; padding: 8px; text-align: center; background: ${bgColor}; color: ${cellColor}; font-weight: bold;">
                  ${cellText}
                </td>`;
            });
          }

          const avgCode = student.averageRating || (student.ratings && student.ratings.length > 0 && !hasSubtopics ? student.ratings[0].rating_type : null) || null;
          const avgText = avgCode ? ratingLabel(avgCode) : 'Belum dinilai';
          const avgColor = (avgCode && tpColors[avgCode]) || '#ffffff';
          const textColor = avgCode
            ? (tpColors[avgCode] ? 'white' : '#111827')
            : '#6b7280';
          const fontWeight = avgCode ? 'bold' : 'normal';

          htmlContent += `
              <td style="border: 1px solid #d1d5db; padding: 8px; text-align: center; background: ${avgColor}; color: ${textColor}; font-weight: ${fontWeight};">
                ${avgText}
              </td>
            </tr>`;
        });

        htmlContent += `
            </tbody>
          </table>
          <div style="margin-top: 30px; text-align: center; font-size: 11px; color: #6b7280; font-style: italic;">
            Dijana pada: ${new Date().toLocaleString('ms-MY')}
          </div>
        </div>`;

        container.innerHTML = htmlContent;
        document.body.appendChild(container);

        try {
          // Render to canvas with high quality
          const canvas = await html2canvas(container, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
          });

          // Calculate PDF dimensions
          const imgWidth = 210; // A4 width in mm
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          // Create PDF
          const pdf = new jsPDF({
            orientation: imgHeight > 297 ? 'portrait' : 'portrait',
            unit: 'mm',
            format: 'a4'
          });

          let heightLeft = imgHeight;
          let position = 0;
          const pageHeight = 297; // A4 height in mm

          // Add image to PDF (split into pages if needed)
          pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;

          while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
          }

          pdf.save(`penilaian-${selectedAssessment?.assessment.class_name}-${new Date().toISOString().split('T')[0]}.pdf`);
        } finally {
          // Clean up
          document.body.removeChild(container);
        }
      } else if (format === 'csv') {
        // Export as CSV
        const endpoint = `/api/assessments/${assessmentId}/export/pdf`; // PDF endpoint returns CSV
        fetch(endpoint)
          .then(response => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.blob();
          })
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
            alert('Gagal mengeksport CSV: ' + error.message);
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

  const handleOpenEditAssessment = () => {
    if (!selectedAssessment) return;
    
    const currentSubtopics = selectedAssessment.subtopics || [];
    
    setEditingAssessment({
      id: selectedAssessment.assessment.id,
      teacher_id: selectedAssessment.assessment.teacher_id?.toString() || '',
      subject_id: selectedAssessment.assessment.subject_id?.toString() || '',
      topic: selectedAssessment.assessment.topic || '',
      assessment_date: selectedAssessment.assessment.assessment_date,
      subtopics: currentSubtopics.map((st: any) => ({ id: st.id, name: st.name })),
      newSubtopics: [] as string[],
      deletedSubtopicIds: [] as number[],
    });
    setShowEditAssessmentModal(true);
  };

  const handleSaveEditAssessment = async () => {
    if (!editingAssessment || !editingAssessment.subject_id || !editingAssessment.assessment_date) {
      alert('Sila lengkapkan semua maklumat');
      return;
    }

    setLoading(true);
    try {
      // Update basic assessment info
      const response = await fetch(`/api/assessments/${editingAssessment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject_id: parseInt(editingAssessment.subject_id, 10),
          topic: editingAssessment.topic,
          assessment_date: editingAssessment.assessment_date,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Handle subtopic deletions
        if (editingAssessment.deletedSubtopicIds && editingAssessment.deletedSubtopicIds.length > 0) {
          for (const subtopicId of editingAssessment.deletedSubtopicIds) {
            await fetch(`/api/subtopics?id=${subtopicId}`, { method: 'DELETE' });
          }
        }

        // Handle subtopic name updates
        if (editingAssessment.subtopics) {
          for (const subtopic of editingAssessment.subtopics) {
            await fetch(`/api/subtopics/${subtopic.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: subtopic.name }),
            });
          }
        }

        // Handle new subtopics
        if (editingAssessment.newSubtopics && editingAssessment.newSubtopics.length > 0) {
          for (const subtopicName of editingAssessment.newSubtopics) {
            if (subtopicName.trim()) {
              await fetch('/api/subtopics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  assessment_id: editingAssessment.id,
                  name: subtopicName.trim(),
                }),
              });
            }
          }
        }

        alert('Penilaian berjaya dikemaskini');
        setShowEditAssessmentModal(false);
        setEditingAssessment(null);
        loadAssessments();
        loadAssessmentDetail(data.data.id);
      } else {
        alert('Gagal kemaskini: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating assessment:', error);
      alert('Gagal kemaskini penilaian');
    } finally {
      setLoading(false);
    }
  };



  const getFinalRating = (student: any, hasSubtopics: boolean): string | null => {
    if (hasSubtopics) return student.averageRating || null;
    return (student.ratings && student.ratings.length > 0 ? student.ratings[0].rating_type : null) || null;
  };

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
            <h1>📚 Sistem Pengurusan Penilaian Murid</h1>
          </div>
        </div>
        <div className="header-actions">
          {(session?.user as any)?.isSuperadmin && (
            <button onClick={() => router.push('/superadmin')} className="btn btn-secondary" style={{ marginRight: '10px' }}>
              🛡️ Superadmin
            </button>
          )}
          <button onClick={() => router.push('/admin')} className="btn btn-secondary" style={{ marginRight: '10px' }}>
            ⚙️ Admin
          </button>
          <div className="user-info">
            <span>👤 {currentUser}</span>
            <button onClick={handleLogout} className="logout-btn">
              🚪 Keluar
            </button>
          </div>
        </div>
        <div className="nav-tabs">
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
        {/* Page: Add Ratings */}
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
                      {a.class_name} - {a.teacher_name} - {a.subject_name}{a.topic ? ` - ${a.topic}` : ''} ({new Date(a.assessment_date).toLocaleDateString('ms-MY')})
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
                  <h3 style={{ textTransform: 'uppercase' }}>{selectedAssessment.assessment.class_name}</h3>
                  <p style={{ textTransform: 'uppercase' }}><strong>GURU:</strong> {selectedAssessment.assessment.teacher_name}</p>
                  <p style={{ textTransform: 'uppercase' }}><strong>SUBJEK:</strong> {selectedAssessment.assessment.subject_name}</p>
                  {selectedAssessment.assessment.topic && <p style={{ textTransform: 'uppercase' }}><strong>TOPIK:</strong> {selectedAssessment.assessment.topic}</p>}
                  <p style={{ textTransform: 'uppercase' }}><strong>TARIKH:</strong> {new Date(selectedAssessment.assessment.assessment_date).toLocaleDateString('ms-MY')}</p>
                  {selectedAssessment.subtopics && selectedAssessment.subtopics.length > 0 && (
                    <div style={{ marginTop: '10px' }}>
                      <p style={{ marginBottom: '5px', textTransform: 'uppercase' }}><strong>STANDARD PEMBELAJARAN:</strong></p>
                      <ul style={{ marginLeft: '20px', marginTop: '5px' }}>
                        {selectedAssessment.subtopics.map((subtopic: any, idx: number) => (
                          <li key={subtopic.id} style={{ textTransform: 'uppercase' }}>SP{idx + 1}: {subtopic.name}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div style={{ marginTop: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleOpenEditAssessment()}
                      style={{ padding: '8px 16px', fontSize: '14px' }}
                    >
                      ✏️ Edit
                    </button>
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

                {(() => {
                  const hasSubtopics = !!(selectedAssessment.subtopics && selectedAssessment.subtopics.length > 0);
                  const finals = selectedAssessment.students.map(s => getFinalRating(s, hasSubtopics));
                  const total = selectedAssessment.students.length;
                  const ratedCount = finals.filter(r => !!r).length;
                  const pct = total > 0 ? Math.round((ratedCount / total) * 100) : 0;

                  // Distribution + summary adapt to the assessment's scale: subtopic
                  // assessments use the TP-level PURATA; direct assessments are binary.
                  const levels: readonly string[] = hasSubtopics ? TP_LEVELS : MASTERY_LEVELS;
                  const info = hasSubtopics ? TP_INFO : MASTERY_INFO;
                  const dist: Record<string, number> = {};
                  levels.forEach(l => { dist[l] = 0; });
                  finals.forEach(r => { if (r && dist[r] !== undefined) dist[r]++; });

                  // Class summary: mean TP for subtopic assessments; % Menguasai otherwise.
                  let avg: string | null = null;
                  let avgTitle = 'Belum ada data';
                  if (hasSubtopics) {
                    const numeric = finals
                      .filter((r): r is string => !!r && r !== 'TD')
                      .map(r => parseInt(r.replace('TP', ''), 10))
                      .filter(n => !isNaN(n));
                    if (numeric.length > 0) {
                      const mean = numeric.reduce((a, b) => a + b, 0) / numeric.length;
                      avg = 'TP' + Math.min(6, Math.max(1, Math.round(mean)));
                      avgTitle = TP_INFO[avg];
                    }
                  } else if (ratedCount > 0) {
                    const masteredPct = Math.round((dist['M'] / ratedCount) * 100);
                    avg = `${masteredPct}% M`;
                    avgTitle = `${dist['M']} daripada ${ratedCount} murid menguasai`;
                  }

                  return (
                    <div className="summary-panel">
                      <div className="summary-card">
                        <h4>📈 Kemajuan Penilaian</h4>
                        <div className="progress-track">
                          <div className="progress-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="progress-meta">
                          <span>{ratedCount} / {total} murid dinilai</span>
                          <span className="progress-pct">{pct}%</span>
                        </div>
                        <div className="progress-avg">
                          <span>{hasSubtopics ? 'Purata penguasaan kelas' : 'Peratus menguasai'}</span>
                          <span className={`avg-badge ${avg && hasSubtopics ? avg.toLowerCase() : (avg ? 'm' : 'none')}`} title={avgTitle}>
                            {avg || '—'}
                          </span>
                        </div>
                      </div>
                      <div className="summary-card">
                        <h4>📊 {hasSubtopics ? 'Taburan Tahap Penguasaan' : 'Taburan Penguasaan'}</h4>
                        <div className="dist-grid">
                          {levels.map(l => (
                            <div key={l} className={`dist-chip ${l.toLowerCase()}`} title={info[l]}>
                              <span className="dist-count">{dist[l]}</span>
                              <span className="dist-label">{l}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {(() => {
                  const hasSubtopics = !!(selectedAssessment.subtopics && selectedAssessment.subtopics.length > 0);
                  return (
                    <div className="tp-legend-card">
                      {hasSubtopics ? (
                        <>
                          <h4>📖 Panduan Penilaian</h4>
                          <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#475569' }}>
                            Setiap standard pembelajaran dinilai secara <strong>Menguasai / Tidak Menguasai</strong>. Purata keseluruhan (TP) ditetapkan oleh guru.
                          </p>
                          <div className="tp-legend">
                            {MASTERY_LEVELS.map(m => (
                              <div key={m} className="tp-legend-item">
                                <span className={`tp-legend-swatch ${m.toLowerCase()}`} style={{ background: `var(--${m.toLowerCase()})` }}>{m}</span>
                                <span>{MASTERY_INFO[m]}</span>
                              </div>
                            ))}
                          </div>
                          <div className="tp-legend" style={{ marginTop: '10px' }}>
                            {TP_LEVELS.map(tp => (
                              <div key={tp} className="tp-legend-item">
                                <span className={`tp-legend-swatch ${tp.toLowerCase()}`} style={{ background: `var(--${tp.toLowerCase()})` }}>{tp}</span>
                                <span>{TP_INFO[tp]}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <>
                          <h4>📖 Panduan Penilaian</h4>
                          <div className="tp-legend">
                            {MASTERY_LEVELS.map(m => (
                              <div key={m} className="tp-legend-item">
                                <span className={`tp-legend-swatch ${m.toLowerCase()}`} style={{ background: `var(--${m.toLowerCase()})` }}>{m}</span>
                                <span>{MASTERY_INFO[m]}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}

                <div className="grade-toolbar">
                  <input
                    type="text"
                    className="grade-search"
                    placeholder="🔍 Cari nama murid..."
                    value={gradeSearch}
                    onChange={(e) => setGradeSearch(e.target.value)}
                  />
                  <label className="grade-toggle">
                    <input
                      type="checkbox"
                      checked={showUnratedOnly}
                      onChange={(e) => setShowUnratedOnly(e.target.checked)}
                    />
                    Tunjuk yang belum dinilai sahaja
                  </label>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table className="students-table">
                    <thead>
                      <tr>
                        <th>BIL</th>
                        <th>NAMA MURID</th>
                        <th style={{ minWidth: '500px' }}>TAHAP PENGUASAAN KESULURUHAN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedAssessment.students
                        .map((student, index) => ({ student, index }))
                        .filter(({ student }) => {
                          const hasSubtopics = !!(selectedAssessment.subtopics && selectedAssessment.subtopics.length > 0);
                          const matchesSearch = !gradeSearch.trim() || student.name.toLowerCase().includes(gradeSearch.trim().toLowerCase());
                          const matchesUnrated = !showUnratedOnly || !getFinalRating(student, hasSubtopics);
                          return matchesSearch && matchesUnrated;
                        })
                        .map(({ student, index }) => {
                        const hasSubtopics = selectedAssessment.subtopics && selectedAssessment.subtopics.length > 0;
                        return (
                          <tr key={student.id}>
                            <td>{index + 1}</td>
                            <td><strong>{student.name}</strong></td>
                            <td>
                              {hasSubtopics ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                  <button
                                    className="btn btn-primary"
                                    onClick={() => handleRatingClick(student.id, student)}
                                    style={{ padding: '6px 12px', fontSize: '12px' }}
                                  >
                                    📝 Nilai
                                  </button>
                                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Purata:</span>
                                  <div className="tp-buttons">
                                    {TP_LEVELS.map(tp => {
                                      const isAverage = student.averageRating === tp;
                                      return (
                                        <button
                                          key={tp}
                                          className={`tp-btn ${tp.toLowerCase()} ${isAverage ? 'selected' : ''}`}
                                          onClick={() => handleOverallRatingClick(student.id, tp, isAverage)}
                                          title={TP_INFO[tp]}
                                        >
                                          {tp}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : (
                                <div className="tp-buttons">
                                  {MASTERY_LEVELS.map(m => {
                                    const isSelected = !!(student.ratings && student.ratings.length > 0 && student.ratings[0].rating_type === m);
                                    return (
                                      <button
                                        key={m}
                                        className={`tp-btn ${m.toLowerCase()} ${isSelected ? 'selected' : ''}`}
                                        onClick={() => handleDirectRatingClick(student.id, m, isSelected)}
                                      >
                                        {MASTERY_INFO[m]}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <h3>Sila pilih penilaian untuk mula</h3>
                <p>Pilih penilaian sedia ada di atas, atau klik &quot;Buat Penilaian Baru&quot;.</p>
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

            {analytics.bySubject && Object.keys(analytics.bySubject).length > 0 && (
              <div className="chart-container">
                <h3>📚 Penilaian Mengikut Subjek</h3>
                <div className="bar-chart">
                  {Object.entries(analytics.bySubject).map(([subject, count]) => {
                    const maxValue = Math.max(...Object.values(analytics.bySubject), 1);
                    return (
                      <div key={subject} className="bar-item">
                        <div className="bar" style={{ height: `${(count / maxValue) * 100}%` }}>
                          <div className="bar-value">{count}</div>
                        </div>
                        <div className="bar-label">{subject}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: Create Assessment */}
      {showCreateAssessmentModal && (
        <div className="modal-overlay" onClick={() => setShowCreateAssessmentModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
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
              <label>Subjek *</label>
              <select
                value={newAssessment.subject_id}
                onChange={(e) => setNewAssessment({ ...newAssessment, subject_id: e.target.value })}
              >
                <option value="">-- Pilih Subjek --</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Topik</label>
              <input
                type="text"
                placeholder="Masukkan topik..."
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

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label style={{ fontWeight: 'bold' }}>Standard Pembelajaran</label>
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => setNewAssessment({ ...newAssessment, subtopics: [...newAssessment.subtopics, ''] })}
                  style={{ padding: '4px 8px', fontSize: '12px' }}
                >
                  ➕ Tambah
                </button>
              </div>
              {newAssessment.subtopics.map((subtopic, index) => (
                <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    placeholder={`Standard Pembelajaran ${index + 1}...`}
                    value={subtopic}
                    onChange={(e) => {
                      const newSubtopics = [...newAssessment.subtopics];
                      newSubtopics[index] = e.target.value;
                      setNewAssessment({ ...newAssessment, subtopics: newSubtopics });
                    }}
                    style={{ flex: 1 }}
                  />
                  {newAssessment.subtopics.length > 1 && (
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => {
                        const newSubtopics = newAssessment.subtopics.filter((_, i) => i !== index);
                        setNewAssessment({ ...newAssessment, subtopics: newSubtopics });
                      }}
                      style={{ padding: '6px 10px', fontSize: '12px' }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
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

      {/* Modal: Edit Assessment */}
      {showEditAssessmentModal && editingAssessment && (
        <div className="modal-overlay" onClick={() => { if (!loading) setShowEditAssessmentModal(false); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <h2>Edit Penilaian</h2>
            <div className="form-group">
              <label>Subjek *</label>
              <select
                value={editingAssessment.subject_id}
                onChange={(e) => setEditingAssessment({ ...editingAssessment, subject_id: e.target.value })}
                disabled={loading}
              >
                <option value="">-- Pilih Subjek --</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Topik</label>
              <input
                type="text"
                placeholder="Masukkan topik..."
                value={editingAssessment.topic}
                onChange={(e) => setEditingAssessment({ ...editingAssessment, topic: e.target.value })}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>Tarikh *</label>
              <input
                type="date"
                value={editingAssessment.assessment_date}
                onChange={(e) => setEditingAssessment({ ...editingAssessment, assessment_date: e.target.value })}
                disabled={loading}
              />
            </div>

            {/* Existing Subtopics */}
            {editingAssessment.subtopics && editingAssessment.subtopics.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontWeight: 'bold', marginBottom: '10px', display: 'block' }}>Standard Pembelajaran Sedia Ada</label>
                {editingAssessment.subtopics.map((subtopic: any, index: number) => (
                  <div key={subtopic.id} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="text"
                      placeholder={`Standard Pembelajaran ${index + 1}...`}
                      value={subtopic.name}
                      onChange={(e) => {
                        const newSubtopics = [...editingAssessment.subtopics];
                        newSubtopics[index] = { ...newSubtopics[index], name: e.target.value };
                        setEditingAssessment({ ...editingAssessment, subtopics: newSubtopics });
                      }}
                      style={{ flex: 1 }}
                      disabled={loading}
                    />
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => {
                        const newSubtopics = editingAssessment.subtopics.filter((_: any, i: number) => i !== index);
                        const deletedIds = [...(editingAssessment.deletedSubtopicIds || []), subtopic.id];
                        setEditingAssessment({ 
                          ...editingAssessment, 
                          subtopics: newSubtopics,
                          deletedSubtopicIds: deletedIds
                        });
                      }}
                      style={{ padding: '6px 10px', fontSize: '12px' }}
                      disabled={loading}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* New Subtopics */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label style={{ fontWeight: 'bold' }}>Tambah Standard Pembelajaran Baru</label>
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => {
                    const newSubtopics = [...(editingAssessment.newSubtopics || []), ''];
                    setEditingAssessment({ ...editingAssessment, newSubtopics });
                  }}
                  style={{ padding: '4px 8px', fontSize: '12px' }}
                  disabled={loading}
                >
                  ➕ Tambah
                </button>
              </div>
              {editingAssessment.newSubtopics && editingAssessment.newSubtopics.map((subtopic: string, index: number) => (
                <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    placeholder={`Standard Pembelajaran baru ${index + 1}...`}
                    value={subtopic}
                    onChange={(e) => {
                      const newSubtopics = [...editingAssessment.newSubtopics];
                      newSubtopics[index] = e.target.value;
                      setEditingAssessment({ ...editingAssessment, newSubtopics });
                    }}
                    style={{ flex: 1 }}
                    disabled={loading}
                  />
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => {
                      const newSubtopics = editingAssessment.newSubtopics.filter((_: string, i: number) => i !== index);
                      setEditingAssessment({ ...editingAssessment, newSubtopics });
                    }}
                    style={{ padding: '6px 10px', fontSize: '12px' }}
                    disabled={loading}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="modal-buttons">
              <button 
                className="btn btn-outline" 
                onClick={() => { setShowEditAssessmentModal(false); setEditingAssessment(null); }}
                disabled={loading}
              >
                Batal
              </button>
              <button className="btn btn-primary" onClick={handleSaveEditAssessment} disabled={loading}>
                {loading ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Rating with Subtopics */}
      {showRatingModal && ratingModalStudent && (
        <div className="modal-overlay" onClick={() => { if (!loading) setShowRatingModal(false); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <h2>Nilai {ratingModalStudent.name}</h2>
            <p style={{ marginBottom: '20px', fontSize: '14px', color: '#666' }}>
              Sila pilih tahap penguasaan untuk setiap standard pembelajaran
            </p>

            {subtopicsForRating.map(subtopic => (
              <div key={subtopic.id} style={{ marginBottom: '20px', padding: '15px', background: '#f9f9f9', borderRadius: '8px' }}>
                <p style={{ marginBottom: '10px', fontWeight: 'bold' }}>{subtopic.name}</p>
                <div className="tp-buttons-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {MASTERY_LEVELS.map(m => (
                    <button
                      key={m}
                      className={`tp-btn ${m.toLowerCase()} ${subtopicRatings[subtopic.id] === m ? 'selected' : ''}`}
                      onClick={() => handleSubtopicRatingChange(subtopic.id, m)}
                      disabled={loading}
                      style={{ padding: '8px 12px', fontSize: '12px' }}
                    >
                      {MASTERY_INFO[m]}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="modal-buttons">
              <button 
                className="btn btn-outline" 
                onClick={() => { setShowRatingModal(false); setRatingModalStudent(null); }}
                disabled={loading}
              >
                Batal
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleCloseRatingModal} 
                disabled={loading}
              >
                {loading ? 'Menyimpan...' : 'Simpan Penilaian'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

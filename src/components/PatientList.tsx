/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Card } from '@/src/components/ui/Card';
import { Input } from '@/src/components/ui/Input';
import { Button } from '@/src/components/ui/Button';
import { Patient, Appointment } from '@/src/types';
import { formatDate, cn } from '@/src/utils';
import {
  Search,
  Filter,
  MoreVertical,
  UserPlus,
  FileDown,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Upload,
  GraduationCap,
} from 'lucide-react';
import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '../contexts/AuthContext';

interface PatientListProps {
  patients: Patient[];
  appointments?: Appointment[];
  onAddPatient: () => void;
  onEditPatient: (patient: Patient) => void;
  onViewDetails: (patient: Patient) => void;
  onRecordVisit: (patient: Patient, type?: string) => void;
  onDeletePatient: (id: string) => void;
  onBulkImport: (patients: Omit<Patient, 'id'>[]) => Promise<void>;
  onTransferOut: (patient: Patient) => void;
  onActivate: (patient: Patient) => void;
}

export function PatientList({ 
  patients, 
  appointments = [],
  onAddPatient, 
  onEditPatient, 
  onViewDetails,
  onRecordVisit, 
  onDeletePatient, 
  onBulkImport,
  onTransferOut,
  onActivate
}: PatientListProps) {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'All' | 'Active' | 'LTFU' | 'Graduating' | 'Transferred'>('All');
  const [importStatus, setImportStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error', message: string }>({ type: 'idle', message: '' });
  const [confirmImport, setConfirmImport] = useState<{ patients: Omit<Patient, 'id'>[], show: boolean }>({ patients: [], show: false });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditable = (createdAt?: any) => {
    if (isAdmin) return true;
    if (!createdAt) return true; 
    const createdDate = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    const now = new Date();
    const diffInHours = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
    return diffInHours <= 48;
  };

  const getNextAppointment = (patientId: string, patientNextAppt?: string) => {
    // Find the earliest pending appointment for this patient
    const pendingAppts = appointments
      .filter(a => a.patientId === patientId && a.status === 'Pending')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    if (pendingAppts.length > 0) {
      return pendingAppts[0].date;
    }
    
    return patientNextAppt;
  };

  const filteredPatients = patients.filter((p) => {
    const matchesSearch =
      p.firstName.toLowerCase().includes(search.toLowerCase()) ||
      p.lastName.toLowerCase().includes(search.toLowerCase()) ||
      p.clinicNumber.toLowerCase().includes(search.toLowerCase()) ||
      (p.phone && p.phone.includes(search));
    
    let matchesFilter = true;
    if (filter === 'Active') matchesFilter = p.ltfuStatus === 'Active';
    else if (filter === 'LTFU') matchesFilter = p.ltfuStatus === 'LTFU';
    else if (filter === 'Graduating') matchesFilter = p.age >= 24 && p.ltfuStatus === 'Active';
    else if (filter === 'Transferred') matchesFilter = p.ltfuStatus === 'Transferred Out';
    
    return matchesSearch && matchesFilter;
  });

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this patient? This action cannot be undone.')) {
      onDeletePatient(id);
    }
  };

  const downloadTemplate = () => {
    const headers = ['MH NO', 'First Name', 'Last Name', 'Phone', 'Age', 'Gender', 'Address', 'OTZ Enrollment Date', 'ART STATUS'];
    const sampleData = [
      ['OTZ-001', 'John', 'Doe', '08012345678', '24', 'Male', '123 Clinic St', '2023-01-15', 'Active'],
      ['OTZ-002', 'Jane', 'Smith', '09087654321', '19', 'Female', '456 Hospital Rd', '2023-02-20', 'Active']
    ];
    
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Patients');
    XLSX.writeFile(wb, 'patient_import_template.xlsx');
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('--- Excel Import Started ---');
    console.log('File Name:', file.name);
    console.log('File Size:', file.size, 'bytes');
    console.log('XLSX Library Version:', XLSX.version);

    setImportStatus({ type: 'loading', message: `Reading ${file.name}...` });

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) throw new Error('Could not read file data. The file might be corrupted or in use.');
        
        console.log('File read complete. Parsing with XLSX...');
        let wb;
        try {
          wb = XLSX.read(data, { type: 'array' });
        } catch (readErr: any) {
          console.error('XLSX.read error:', readErr);
          throw new Error(`Failed to parse Excel file format: ${readErr.message}`);
        }
        
        if (!wb || !wb.SheetNames.length) {
          throw new Error('The Excel file is empty or has no sheets.');
        }

        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        // Read as array of arrays to find headers manually
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
        console.log('Total raw rows found in sheet:', rows.length);

        if (rows.length === 0) {
          throw new Error('The first sheet of this Excel file appears to be empty.');
        }

        // Find the header row (first row that has at least 2 of our keywords)
        const keywords = ['clinic', 'name', 'phone', 'age', 'gender', 'sex', 'id', 'number', 'dob', 'birth', 'status'];
        let headerRowIndex = -1;
        
        for (let i = 0; i < Math.min(rows.length, 20); i++) {
          const row = rows[i];
          if (!Array.isArray(row)) continue;
          
          const matchCount = row.filter(cell => {
            if (!cell) return false;
            const clean = String(cell).toLowerCase();
            return keywords.some(kw => clean.includes(kw));
          }).length;
          
          if (matchCount >= 2) {
            headerRowIndex = i;
            break;
          }
        }

        if (headerRowIndex === -1) {
          const firstRowPreview = rows[0]?.slice(0, 5).map(c => String(c || 'empty')).join(', ') || 'empty';
          throw new Error(`Could not find a header row. \n\nI checked the first 20 rows but didn't see columns like "MH NO", "Name", "Phone", or "Age". \n\nRow 1 looks like: [${firstRowPreview}]. \n\nPlease ensure your headers are in the first few rows.`);
        }

        const headers = rows[headerRowIndex].map(h => String(h || '').trim());
        const dataRows = rows.slice(headerRowIndex + 1).filter(row => row.length > 0 && row.some(cell => cell !== null && cell !== ''));

        console.log('Header row found at index:', headerRowIndex);
        console.log('Headers detected:', headers);
        console.log('Valid data rows found:', dataRows.length);

        if (dataRows.length === 0) {
          throw new Error(`Found headers at row ${headerRowIndex + 1}, but no data rows were found after it.`);
        }

        // Helper to find column index by multiple possible names
        const findColIndex = (possibleNames: string[]) => {
          return headers.findIndex(h => {
            const cleanH = h.toLowerCase().replace(/[^a-z0-9]/g, '');
            return possibleNames.some(name => {
              const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
              return cleanH === cleanName || cleanH.includes(cleanName) || cleanH.includes(cleanName);
            });
          });
        };

        const colMap = {
          clinicNumber: findColIndex(['clinicNumber', 'clinicno', 'mhno', 'mh no', 'id', 'patientid', 'number', 'clinic', 'patientno']),
          firstName: findColIndex(['firstName', 'first', 'fname', 'givenname']),
          lastName: findColIndex(['lastName', 'last', 'lname', 'surname', 'familyname']),
          fullName: findColIndex(['name', 'fullname', 'patientname', 'names']),
          age: findColIndex(['age', 'years', 'ageyears']),
          gender: findColIndex(['gender', 'sex']),
          phone: findColIndex(['phone', 'telephone', 'mobile', 'contact', 'cell', 'phoneno', 'phonenumber']),
          address: findColIndex(['address', 'location', 'residence', 'home']),
          enrollmentDate: findColIndex(['enrollmentDate', 'otzenrollmentdate', 'otz enrollment date', 'enrolled', 'dateenrolled', 'startdate', 'regdate']),
          dateOfBirth: findColIndex(['dateOfBirth', 'dob', 'birthdate']),
          ltfuStatus: findColIndex(['ltfuStatus', 'artstatus', 'art status', 'status', 'currentstatus']),
        };

        console.log('Column Mapping Results:', colMap);

        const required: (keyof typeof colMap)[] = ['clinicNumber', 'age', 'gender', 'phone'];
        const missing = required.filter(f => colMap[f] === -1);
        
        const hasNames = (colMap.firstName !== -1 && colMap.lastName !== -1) || colMap.fullName !== -1;
        if (!hasNames) missing.push('firstName' as any);

        if (missing.length > 0) {
          const missingNames = missing.map(m => m === 'firstName' ? 'Patient Name' : m).join(', ');
          throw new Error(`Missing required columns: ${missingNames}. \n\nI found these headers: [${headers.join(', ')}]. \n\nPlease check the column names in your Excel file.`);
        }

        // Helper to parse Excel date
        const parseExcelDate = (val: any) => {
          if (!val) return null;
          if (typeof val === 'number') {
            const date = new Date((val - 25569) * 86400 * 1000);
            return date.toISOString().split('T')[0];
          }
          if (typeof val === 'string') {
            const d = new Date(val);
            if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
          }
          return null;
        };

        const patientsToImport: Omit<Patient, 'id'>[] = dataRows.map((row, idx) => {
          let fName = '';
          let lName = '';
          
          if (colMap.firstName !== -1 && colMap.lastName !== -1) {
            fName = String(row[colMap.firstName] || '').trim();
            lName = String(row[colMap.lastName] || '').trim();
          } else if (colMap.fullName !== -1) {
            const full = String(row[colMap.fullName] || '').trim().split(/\s+/);
            fName = full[0] || '';
            lName = full.slice(1).join(' ') || '';
          }

          const ageVal = Number(row[colMap.age]);
          const age = isNaN(ageVal) ? 0 : ageVal;

          // Normalize Status
          let status: any = 'Active';
          if (colMap.ltfuStatus !== -1) {
            const rawStatus = String(row[colMap.ltfuStatus] || '').trim().toLowerCase();
            if (rawStatus.includes('active')) status = 'Active';
            else if (rawStatus.includes('ltfu') || rawStatus.includes('lost')) status = 'LTFU';
            else if (rawStatus.includes('dead') || rawStatus.includes('died')) status = 'Dead';
            else if (rawStatus.includes('transfer')) status = 'Transferred Out';
          }

          const patient = {
            clinicNumber: String(row[colMap.clinicNumber] || '').trim() || `TMP-${idx}-${Date.now()}`,
            firstName: fName || 'Unknown',
            lastName: lName || 'Patient',
            age: age,
            gender: (String(row[colMap.gender] || '').toLowerCase().startsWith('m')) ? 'Male' : 'Female' as 'Male' | 'Female',
            phone: colMap.phone !== -1 ? String(row[colMap.phone] || '').trim() : '',
            address: colMap.address !== -1 ? String(row[colMap.address] || '').trim() : '',
            enrollmentDate: parseExcelDate(row[colMap.enrollmentDate]) || new Date().toISOString().split('T')[0],
            dateOfBirth: (colMap.dateOfBirth !== -1 ? parseExcelDate(row[colMap.dateOfBirth]) : null) || null,
            ltfuStatus: status,
            vlSuppressed: true,
          };

          if (idx < 2) {
            console.log(`Patient ${idx} preview:`, patient);
          }

          return patient;
        });

        // Client-side validation to catch errors before batch commit
        const invalidPatients = patientsToImport.filter(p => 
          !p.clinicNumber || p.clinicNumber.length > 50 ||
          !p.firstName || p.firstName.length > 50 ||
          !p.lastName || p.lastName.length > 50 ||
          p.age < 0 || p.age > 150 ||
          !['Active', 'LTFU', 'Dead', 'Transferred Out'].includes(p.ltfuStatus)
        );

        if (invalidPatients.length > 0) {
          console.error('Invalid patients found:', invalidPatients);
          throw new Error(`Found ${invalidPatients.length} patients with invalid data (empty names, clinic numbers too long, or invalid status). Please check your file.`);
        }

        console.log('Prepared', patientsToImport.length, 'patients for import.');
        setConfirmImport({ patients: patientsToImport, show: true });
        setImportStatus({ type: 'idle', message: '' });
      } catch (error: any) {
        console.error('--- Excel Import Error ---');
        console.error(error);
        setImportStatus({ type: 'error', message: error.message || 'An unexpected error occurred during import.' });
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    
    reader.onprogress = (data) => {
      if (data.lengthComputable) {
        const progress = Math.round((data.loaded / data.total) * 100);
        setImportStatus({ type: 'loading', message: `Reading file: ${progress}%` });
      }
    };

    reader.onerror = (err) => {
      console.error('FileReader error:', err);
      setImportStatus({ type: 'error', message: 'The browser could not read the file. Try a different file or browser.' });
    };
    
    console.log('Starting file read...');
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmImport = async () => {
    const patientsToImport = confirmImport.patients;
    setConfirmImport({ patients: [], show: false });
    setImportStatus({ type: 'loading', message: `Saving ${patientsToImport.length} patients to database...` });
    
    try {
      console.log('Initiating bulk import for', patientsToImport.length, 'patients');
      await onBulkImport(patientsToImport);
      console.log('Bulk import successful!');
      setImportStatus({ type: 'success', message: `Successfully imported ${patientsToImport.length} patients!` });
      setTimeout(() => setImportStatus({ type: 'idle', message: '' }), 10000);
    } catch (dbErr: any) {
      console.error('Database error during bulk import:', dbErr);
      let errorMessage = dbErr.message || 'Failed to save patients to the database.';
      try {
        // Try to parse our custom Firestore error JSON
        const parsed = JSON.parse(dbErr.message);
        if (parsed.error) {
          errorMessage = parsed.error;
          if (errorMessage.includes('Missing or insufficient permissions')) {
            errorMessage = "Permission Denied: You don't have access to save these patients. Please check your login status.";
          }
        }
      } catch (e) {
        // Not a JSON error, use raw message
      }
      setImportStatus({ type: 'error', message: `Database Error: ${errorMessage}` });
    }
  };

  return (
    <div className="space-y-6">
      {confirmImport.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-lg p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3 text-indigo-600">
              <Upload className="h-6 w-6" />
              <h2 className="text-xl font-bold">Confirm Import</h2>
            </div>
            <p className="mb-4 text-slate-600">
              I found <span className="font-bold text-slate-900">{confirmImport.patients.length}</span> patients in your file. 
              Would you like to import them now?
            </p>
            
            <div className="mb-6 rounded-xl bg-slate-50 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Preview (First 3):</p>
              <div className="space-y-2">
                {confirmImport.patients.slice(0, 3).map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{p.firstName} {p.lastName}</span>
                    <span className="text-slate-500">{p.clinicNumber}</span>
                  </div>
                ))}
                {confirmImport.patients.length > 3 && (
                  <p className="text-xs text-slate-400 italic">...and {confirmImport.patients.length - 3} more</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  console.log('User cancelled import confirmation.');
                  setConfirmImport({ patients: [], show: false });
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleConfirmImport}>
                Import Now
              </Button>
            </div>
          </Card>
        </div>
      )}

      {importStatus.type !== 'idle' && (
        <div className={cn(
          "mb-4 flex items-center justify-between rounded-xl p-4 text-sm font-medium shadow-sm border",
          importStatus.type === 'loading' && "bg-indigo-50 text-indigo-700 border-indigo-100",
          importStatus.type === 'success' && "bg-emerald-50 text-emerald-700 border-emerald-100",
          importStatus.type === 'error' && "bg-rose-50 text-rose-700 border-rose-100"
        )}>
          <div className="flex items-center gap-3">
            {importStatus.type === 'loading' && <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />}
            {importStatus.type === 'success' && <CheckCircle2 className="h-5 w-5" />}
            {importStatus.type === 'error' && <AlertCircle className="h-5 w-5" />}
            <span className="whitespace-pre-wrap">{importStatus.message}</span>
          </div>
          <button 
            onClick={() => setImportStatus({ type: 'idle', message: '' })}
            className="ml-4 rounded-lg p-1 hover:bg-black/5"
          >
            <ChevronRight className="h-4 w-4 rotate-90" />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Patient Management
          </h1>
          <p className="text-slate-500">
            Search, filter and manage all clinic patients.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportExcel}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2" 
            onClick={downloadTemplate}
          >
            <FileDown className="h-4 w-4" />
            Template
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2" 
            onClick={() => fileInputRef.current?.click()}
            disabled={importStatus.type === 'loading'}
          >
            <Upload className={cn("h-4 w-4", importStatus.type === 'loading' && "animate-bounce")} />
            {importStatus.type === 'loading' ? 'Processing...' : 'Import Excel'}
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => {
            const csvContent = [
              ['MH NO', 'First Name', 'Last Name', 'Phone', 'Age', 'Gender', 'ART STATUS', 'Last Visit', 'Next Appointment', 'VL Status'].join(','),
              ...patients.map(p => [
                p.clinicNumber,
                p.firstName,
                p.lastName,
                p.phone || '',
                p.age,
                p.gender,
                p.ltfuStatus,
                p.lastVisitDate || 'N/A',
                getNextAppointment(p.id!, p.nextAppointmentDate) || 'N/A',
                p.vlSuppressed ? 'Suppressed' : 'Unsuppressed'
              ].join(','))
            ].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'patients_export.csv';
            link.click();
          }}>
            <FileDown className="h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={onAddPatient} size="sm" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Add Patient
          </Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-6 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by name or clinic number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 p-1">
              {(['All', 'Active', 'LTFU', 'Graduating', 'Transferred'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                    filter === f
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50'
                  )}
                >
                  {f === 'Transferred' ? 'Transferred Out' : f === 'Graduating' ? 'About to Graduate' : f}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4">MH NO</th>
                <th className="px-6 py-4">Patient Name</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4">Age/Gender</th>
                <th className="px-6 py-4">ART STATUS</th>
                <th className="px-6 py-4">Last Visit</th>
                <th className="px-6 py-4">Next Appt</th>
                <th className="px-6 py-4">VL Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredPatients.map((patient) => (
                <tr
                  key={patient.id}
                  className="group transition-colors hover:bg-slate-50/50"
                >
                  <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-900">
                    <button 
                      onClick={() => onViewDetails(patient)}
                      className="hover:text-indigo-600 hover:underline"
                    >
                      {patient.clinicNumber}
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex flex-col">
                      <button 
                        onClick={() => onViewDetails(patient)}
                        className="text-left font-medium text-slate-900 hover:text-indigo-600 hover:underline"
                      >
                        {patient.firstName} {patient.lastName}
                      </button>
                      <span className="text-xs text-slate-500">
                        Enrolled: {formatDate(patient.enrollmentDate)}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                    {patient.phone || 'N/A'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                    {patient.age}y / {patient.gender}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                        patient.ltfuStatus === 'Active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : patient.ltfuStatus === 'Transferred Out'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-rose-50 text-rose-700'
                      )}
                    >
                      {patient.ltfuStatus}
                    </span>
                    {patient.age >= 24 && patient.ltfuStatus === 'Active' && (
                      <div className="mt-1 flex items-center gap-1 text-[10px] font-medium text-amber-600">
                        <GraduationCap className="h-3 w-3" />
                        Graduating Soon
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                    {formatDate(patient.lastVisitDate)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                    {formatDate(getNextAppointment(patient.id!, patient.nextAppointmentDate))}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {patient.vlSuppressed !== undefined ? (
                      patient.vlSuppressed ? (
                        <div className="flex items-center gap-1 text-emerald-600">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-xs font-medium">Suppressed</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-rose-600">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-xs font-medium">Unsuppressed</span>
                        </div>
                      )
                    ) : (
                      <span className="text-xs text-slate-400">No Record</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-indigo-600 hover:bg-indigo-50"
                        onClick={() => onViewDetails(patient)}
                      >
                        History
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-indigo-600 hover:bg-indigo-50"
                        onClick={() => onRecordVisit(patient, 'Drug Pickup & VL Test')}
                      >
                        Pickup
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-rose-600 hover:bg-rose-50"
                        onClick={() => onTransferOut(patient)}
                        disabled={patient.ltfuStatus === 'Transferred Out'}
                        title="Transfer Out Client"
                      >
                        Transfer
                      </Button>
                      {patient.ltfuStatus !== 'Active' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-emerald-600 hover:bg-emerald-50"
                          onClick={() => onActivate(patient)}
                          title="Reactivate Client"
                        >
                          Activate
                        </Button>
                      )}
                      <button
                        onClick={() => onEditPatient(patient)}
                        className={cn(
                          "rounded-lg p-2 transition-colors",
                          isEditable(patient.createdAt) 
                            ? "text-slate-400 hover:bg-slate-100 hover:text-slate-600" 
                            : "text-slate-200 cursor-not-allowed"
                        )}
                        disabled={!isEditable(patient.createdAt)}
                        title={isEditable(patient.createdAt) ? "Edit" : "Edit locked (48h passed)"}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(patient.id!)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-rose-100 hover:text-rose-600"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
          <p className="text-xs text-slate-500">
            Showing <span className="font-medium text-slate-900">{filteredPatients.length}</span> of{' '}
            <span className="font-medium text-slate-900">{patients.length}</span> patients
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

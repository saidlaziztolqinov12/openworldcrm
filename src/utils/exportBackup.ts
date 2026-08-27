import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase.config';

export async function exportAcademyBackup(): Promise<void> {
  const collectionsToFetch = ['users', 'groups', 'students', 'attendance', 'attendance_records', 'salary_advances', 'group_logs'];
  const dataPayload: Record<string, any[]> = {};

  for (const colName of collectionsToFetch) {
    try {
      const snap = await getDocs(collection(db, colName));
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (colName === 'attendance_records') {
        dataPayload['attendance'] = [...(dataPayload['attendance'] || []), ...items];
      } else {
        dataPayload[colName] = items;
      }
    } catch (e) {
      console.error(`Error fetching collection ${colName}:`, e);
      if (!dataPayload[colName]) {
        dataPayload[colName] = [];
      }
    }
  }

  if (!dataPayload['attendance']) {
    dataPayload['attendance'] = [];
  }

  const dateStr = new Date().toISOString().split('T')[0];

  // 1. Generate Raw JSON
  const jsonString = JSON.stringify(dataPayload, null, 2);
  const jsonBlob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const jsonFilename = `academy_backup_${dateStr}.json`;

  // 2. Generate Formatted Word Document (.doc)
  const users = dataPayload['users'] || [];
  const groups = dataPayload['groups'] || [];
  const students = dataPayload['students'] || [];
  const salaryAdvances = dataPayload['salary_advances'] || [];
  const attendance = dataPayload['attendance'] || [];
  const groupLogs = dataPayload['group_logs'] || [];

  const timestampStr = new Date().toLocaleString();

  const getGroupStudentCount = (groupId: string) => {
    return students.filter(s => s.groupId === groupId && s.status !== 'inactive').length;
  };

  const htmlContent = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset="utf-8">
<title>Academy Export Report</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #333333; line-height: 1.4; margin: 20px; }
  h1 { color: #1e293b; font-size: 24px; margin-bottom: 4px; }
  .subtitle { color: #64748b; font-size: 13px; margin-bottom: 20px; }
  .banner { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; margin-bottom: 25px; border-radius: 6px; }
  .banner h3 { margin: 0 0 10px 0; font-size: 16px; color: #0f172a; }
  .counts-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  .counts-table td { padding: 6px 10px; font-size: 13px; border: 1px solid #e2e8f0; text-align: center; }
  .counts-table th { background: #f1f5f9; padding: 6px 10px; font-size: 13px; border: 1px solid #e2e8f0; text-align: center; }
  h2 { color: #334155; font-size: 18px; margin-top: 30px; margin-bottom: 10px; border-bottom: 2px solid #cbd5e1; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
  th { background-color: #0f172a; color: #ffffff; text-align: left; padding: 8px 10px; border: 1px solid #334155; }
  td { padding: 7px 10px; border: 1px solid #cbd5e1; }
  tr:nth-child(even) { background-color: #f8fafc; }
</style>
</head>
<body>
  <h1>Learning Center Management Report</h1>
  <div class="subtitle">Generated on: ${timestampStr}</div>

  <div class="banner">
    <h3>Summary Overview</h3>
    <table class="counts-table">
      <tr>
        <th>Total Users / Staff</th>
        <th>Active Groups</th>
        <th>Total Students</th>
        <th>Salary Advances</th>
        <th>Attendance Logs</th>
        <th>Activity Logs</th>
      </tr>
      <tr>
        <td>${users.length}</td>
        <td>${groups.filter(g => !g.archived).length}</td>
        <td>${students.length}</td>
        <td>${salaryAdvances.length}</td>
        <td>${attendance.length}</td>
        <td>${groupLogs.length}</td>
      </tr>
    </table>
  </div>

  <h2>1. Teachers & Administrators</h2>
  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Role</th>
        <th>Email / Login</th>
        <th>Phone</th>
      </tr>
    </thead>
    <tbody>
      ${users.length === 0 ? `<tr><td colspan="4" style="text-align: center; color: #64748b;">No users recorded.</td></tr>` : users.map(u => `
        <tr>
          <td><b>${u.name || 'N/A'}</b></td>
          <td>${u.role || 'teacher'}</td>
          <td>${u.email || u.login || 'N/A'}</td>
          <td>${u.phone || 'N/A'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h2>2. Active Groups</h2>
  <table>
    <thead>
      <tr>
        <th>Group Name</th>
        <th>Instructor</th>
        <th>Schedule Days & Time</th>
        <th>Room</th>
        <th>Student Count</th>
      </tr>
    </thead>
    <tbody>
      ${groups.length === 0 ? `<tr><td colspan="5" style="text-align: center; color: #64748b;">No groups recorded.</td></tr>` : groups.map(g => `
        <tr>
          <td><b>${g.name}</b> ${g.archived ? '(Archived)' : ''}</td>
          <td>${g.teacherName || 'Unassigned'}</td>
          <td>${g.schedule || 'N/A'}</td>
          <td>${g.room || 'N/A'}</td>
          <td>${getGroupStudentCount(g.id)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h2>3. Student Directory</h2>
  <table>
    <thead>
      <tr>
        <th>Student Name</th>
        <th>Group</th>
        <th>Student Phone</th>
        <th>Parent Phone</th>
        <th>Status</th>
        <th>Date Added</th>
      </tr>
    </thead>
    <tbody>
      ${students.length === 0 ? `<tr><td colspan="6" style="text-align: center; color: #64748b;">No students recorded.</td></tr>` : students.map(s => {
        const grp = groups.find(g => g.id === s.groupId);
        return `
          <tr>
            <td><b>${s.firstName} ${s.surname}</b></td>
            <td>${grp ? grp.name : 'Unassigned'}</td>
            <td>${s.phone || 'N/A'}</td>
            <td>${s.parentPhone || 'N/A'}</td>
            <td>${s.status || 'active'}</td>
            <td>${s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'N/A'}</td>
          </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  <h2>4. Salary Advances & Financial Records</h2>
  <table>
    <thead>
      <tr>
        <th>Recipient</th>
        <th>Amount (UZS)</th>
        <th>Date</th>
        <th>Settled Status</th>
        <th>Note</th>
      </tr>
    </thead>
    <tbody>
      ${salaryAdvances.length === 0 ? `<tr><td colspan="5" style="text-align: center; color: #64748b;">No salary advances recorded.</td></tr>` : salaryAdvances.map(sa => `
        <tr>
          <td><b>${sa.teacherName || 'Recipient'}</b></td>
          <td>${Number(sa.amount || 0).toLocaleString()}</td>
          <td>${sa.date || sa.createdAt || 'N/A'}</td>
          <td>${sa.settled ? 'Settled' : 'Pending'}</td>
          <td>${sa.note || ''}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

</body>
</html>
  `;

  const docBlob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
  const docFilename = `academy_report_${dateStr}.doc`;

  // Trigger downloads sequentially with 400ms interval
  triggerDownload(jsonBlob, jsonFilename);
  await new Promise(resolve => setTimeout(resolve, 400));
  triggerDownload(docBlob, docFilename);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

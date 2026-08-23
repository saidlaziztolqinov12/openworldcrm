import { Student } from '../types';

export function generateUniqueStudentId(existingStudents: Student[]): string {
  const existingIds = new Set(
    existingStudents.map((s) => s.studentId || (s.id.length === 5 && !isNaN(Number(s.id)) ? s.id : '')).filter(Boolean)
  );

  let attempts = 0;
  let id = '';
  do {
    const num = Math.floor(10000 + Math.random() * 90000); // 10000 to 99999
    id = num.toString();
    attempts++;
    if (attempts > 2000) {
      // Fallback if space is extremely dense
      id = Math.floor(10000 + Math.random() * 90000).toString();
      break;
    }
  } while (existingIds.has(id));

  return id;
}

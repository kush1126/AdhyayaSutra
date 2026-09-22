// Google Sheets API utility for progress tracking

const SHEETS_API_KEY = import.meta.env.VITE_SHEETS_API_KEY || '';
const SPREADSHEET_ID = import.meta.env.VITE_SPREADSHEET_ID || '';

export interface ProgressEntry {
  studentName: string;
  subject: string;
  topic: string;
  moduleName: string;
  quizScore: number;
  completedAt: string;
  difficulty: string;
}

export async function appendProgressToSheet(entry: ProgressEntry): Promise<boolean> {
  if (!SHEETS_API_KEY || !SPREADSHEET_ID) {
    console.warn('Google Sheets API not configured. Storing progress locally only.');
    storeProgressLocally(entry);
    return false;
  }

  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Sheet1!A:G:append?valueInputOption=USER_ENTERED&key=${SHEETS_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          values: [[
            entry.studentName,
            entry.subject,
            entry.topic,
            entry.moduleName,
            entry.quizScore,
            entry.completedAt,
            entry.difficulty,
          ]],
        }),
      }
    );

    if (!response.ok) {
      console.error('Sheets API error:', response.status);
      storeProgressLocally(entry);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to write to Google Sheets:', error);
    storeProgressLocally(entry);
    return false;
  }
}

function storeProgressLocally(entry: ProgressEntry): void {
  const key = 'adhyaya_progress_log';
  const existing = JSON.parse(localStorage.getItem(key) || '[]');
  existing.push({ ...entry, syncedToSheets: false });
  localStorage.setItem(key, JSON.stringify(existing));
}

export function getLocalProgressLog(): (ProgressEntry & { syncedToSheets: boolean })[] {
  return JSON.parse(localStorage.getItem('adhyaya_progress_log') || '[]');
}

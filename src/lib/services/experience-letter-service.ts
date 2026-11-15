import { supabase } from '../supabase-client';
import { DB_TABLES } from '../../core/database.tables';
import { Employee } from '../../types';
import { ExperienceLetterData, Salutation } from '../../types/document.types';

/**
 * Format any ISO date string (YYYY-MM-DD) into standard British English display (e.g. 1 January 2024)
 * Parsing explicit parts prevents timezone shifting issues.
 */
export function formatDisplayDate(dateStr?: string): string {
  if (!dateStr) return 'N/A';
  try {
    const clean = dateStr.split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  } catch {}
  return dateStr;
}

/**
 * Accurately calculate duration of employment in human-readable format
 */
export function calculateTenure(joiningDateStr?: string, endDateStr?: string): { years: number; months: number; text: string } {
  if (!joiningDateStr) return { years: 0, months: 0, text: '0 years' };

  try {
    const startParts = joiningDateStr.split('T')[0].split('-');
    const start = startParts.length === 3
      ? new Date(parseInt(startParts[0], 10), parseInt(startParts[1], 10) - 1, parseInt(startParts[2], 10))
      : new Date(joiningDateStr);

    let end = new Date();
    if (endDateStr) {
      const endParts = endDateStr.split('T')[0].split('-');
      end = endParts.length === 3
        ? new Date(parseInt(endParts[0], 10), parseInt(endParts[1], 10) - 1, parseInt(endParts[2], 10))
        : new Date(endDateStr);
    }

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return { years: 0, months: 0, text: '0 years' };
    }

    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();
    let days = end.getDate() - start.getDate();

    if (days < 0) {
      months--;
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    let text = '';
    if (years > 0 && months > 0) {
      text = `${years} ${years === 1 ? 'year' : 'years'} ${months} ${months === 1 ? 'month' : 'months'}`;
    } else if (years > 0) {
      text = `${years} ${years === 1 ? 'year' : 'years'}`;
    } else if (months > 0) {
      text = `${months} ${months === 1 ? 'month' : 'months'}`;
    } else {
      text = 'Less than 1 month';
    }

    return { years, months, text };
  } catch {
    return { years: 0, months: 0, text: '0 years' };
  }
}

/**
 * Generate default experience letter data dynamically by auto-fetching from the employee profile.
 */
export function generateDefaultLetter(employee: Employee): ExperienceLetterData {
  const title: Salutation = employee.gender === 'female' ? 'Ms.' : 'Mr.';
  const todayStr = new Date().toISOString().split('T')[0];
  const joinDate = employee.joiningDate || todayStr;
  const isCurrentlyEmployed = employee.status !== 'inactive';
  const relievingDate = isCurrentlyEmployed ? undefined : todayStr;
  
  const tenure = calculateTenure(joinDate, relievingDate);
  const formattedJoinDate = formatDisplayDate(joinDate);
  const formattedRelieveDate = relievingDate ? formatDisplayDate(relievingDate) : 'Present';
  const companyName = 'Srikanth Manpower Solutions';
  const pronounHeShe = employee.gender === 'female' ? 'She' : 'He';
  const pronounHimHer = employee.gender === 'female' ? 'her' : 'him';
  const pronounHisHer = employee.gender === 'female' ? 'her' : 'his';

  const refSuffix = employee.id.includes('-') ? employee.id.split('-').pop() : employee.id.slice(-4);
  const referenceNo = `SMS/HR/EXP/${new Date().getFullYear()}/${refSuffix}`;

  const openingParagraph = isCurrentlyEmployed
    ? `This is to certify that ${title} ${employee.name} (Employee ID: ${employee.id}) has been employed with ${companyName} since ${formattedJoinDate}.`
    : `This is to certify that ${title} ${employee.name} (Employee ID: ${employee.id}) was employed with ${companyName} from ${formattedJoinDate} to ${formattedRelieveDate}.`;

  const tenureParagraph = `During their tenure, they have successfully served in the capacity of ${employee.designation || 'Staff'}. They have completed approximately ${tenure.text} of service with our organization.`;

  const conductParagraph = `We have found ${pronounHimHer} to be a dedicated, hardworking, and reliable employee. ${pronounHeShe} possesses good conduct and has maintained a professional attitude towards ${pronounHisHer} responsibilities.`;

  const closingParagraph = `We wish ${pronounHimHer} success in all future endeavors.`;

  return {
    employeeId: employee.id,
    referenceNo,
    issueDate: todayStr,
    companyName,
    companyAddress: 'Visakhapatnam, Andhra Pradesh',
    companyContact: '+91 99999 99999',
    companyEmail: 'hr@srikanthmanpower.com',
    title,
    employeeName: employee.name,
    designation: employee.designation,
    department: 'Front Office',
    joiningDate: joinDate,
    isCurrentlyEmployed,
    relievingDate: isCurrentlyEmployed ? undefined : todayStr,
    tenureDuration: tenure.text,
    documentTitle: 'TO WHOMSOEVER IT MAY CONCERN',
    openingParagraph,
    tenureParagraph,
    conductParagraph,
    closingParagraph,
    signatoryEntity: `For ${companyName}`,
    signatoryName: 'Authorized Signatory',
    signatoryDepartment: 'Human Resources Department',
    updatedAt: new Date().toISOString()
  };
}

/**
 * Fetch existing saved experience letter for an employee.
 * Checks LocalStorage -> Supabase -> Falls back to default auto-generated letter.
 */
export async function getExperienceLetter(employee: Employee): Promise<ExperienceLetterData> {
  // 1. Try LocalStorage for immediate instant retrieval
  if (typeof window !== 'undefined') {
    try {
      const local = localStorage.getItem(`sms_hrms_exp_letter_${employee.id}`);
      if (local) {
        const parsed = JSON.parse(local);
        return {
          ...generateDefaultLetter(employee),
          ...parsed,
          employeeId: employee.id
        };
      }
    } catch {}
  }

  // 2. Try Supabase (in dlabs schema)
  try {
    const { data, error } = await supabase
      .from(DB_TABLES.EXPERIENCE_LETTERS)
      .select('*')
      .eq('employee_id', employee.id)
      .maybeSingle();

    if (!error && data?.letter_data) {
      // Cache locally
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`sms_hrms_exp_letter_${employee.id}`, JSON.stringify(data.letter_data));
        } catch {}
      }
      return {
        ...generateDefaultLetter(employee),
        ...data.letter_data,
        employeeId: employee.id
      };
    }
  } catch {}

  // 3. Fallback: Default dynamically constructed with auto-fetched joining date
  return generateDefaultLetter(employee);
}

/**
 * Save an edited experience letter to LocalStorage and Supabase.
 */
export async function saveExperienceLetter(employeeId: string, data: ExperienceLetterData): Promise<void> {
  const payload = {
    ...data,
    employeeId,
    updatedAt: new Date().toISOString()
  };

  // 1. Always cache in LocalStorage first (works immediately offline or online)
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`sms_hrms_exp_letter_${employeeId}`, JSON.stringify(payload));
    } catch {}
  }

  // 2. Persist to Supabase (in dlabs schema)
  try {
    await supabase
      .from(DB_TABLES.EXPERIENCE_LETTERS)
      .upsert({
        employee_id: employeeId,
        letter_data: payload,
        updated_at: new Date().toISOString()
      }, { onConflict: 'employee_id' });
  } catch (err) {
    console.warn('Supabase experience letter save note:', err);
  }
}

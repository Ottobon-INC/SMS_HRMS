// ====================================================================
// Document & Experience Letter Types
// ====================================================================

export type Salutation = 'Mr.' | 'Ms.' | 'Mrs.' | 'Dr.';

export interface ExperienceLetterData {
  id?: string;
  employeeId: string;
  referenceNo: string;
  issueDate: string; // Format: YYYY-MM-DD or formatted display date

  // Organization letterhead details
  companyName: string;
  companyAddress: string;
  companyContact: string;
  companyEmail: string;

  // Employee details
  title: Salutation;
  employeeName: string;
  designation: string;
  department?: string;

  // Dates & Tenure (Auto-matched from Employee.joiningDate)
  joiningDate: string; // Format: YYYY-MM-DD
  isCurrentlyEmployed: boolean;
  relievingDate?: string; // Format: YYYY-MM-DD if relieved/left
  tenureDuration: string; // e.g. "2 years 10 months" or "2.8 years"

  // Letter Content
  documentTitle: string; // e.g. "TO WHOMSOEVER IT MAY CONCERN"
  openingParagraph: string;
  tenureParagraph: string;
  conductParagraph: string;
  closingParagraph: string;

  // Signatory & Stamp
  signatoryEntity: string; // e.g. "For Srikanth Manpower Solutions"
  signatoryName: string; // e.g. "Authorized Signatory"
  signatoryDepartment: string; // e.g. "Human Resources Department"

  updatedAt?: string;
}

import React, { forwardRef } from 'react';
import { Employee, Language } from '../types';
import { ExperienceLetterData } from '../types/document.types';
import { generateDefaultLetter, formatDisplayDate } from '../lib/services/experience-letter-service';
import SmsLogo from './SmsLogo';

export interface ExperienceLetterProps {
  employee?: Employee;
  letterData?: ExperienceLetterData;
  language?: Language;
}

const ExperienceLetter = forwardRef<HTMLDivElement, ExperienceLetterProps>(({ employee, letterData, language }, ref) => {
  // Use provided letterData or generate defaults from employee
  const data: ExperienceLetterData = letterData || (employee ? generateDefaultLetter(employee) : {
    employeeId: 'EMP-000',
    referenceNo: 'SMS/HR/EXP/2026/000',
    issueDate: new Date().toISOString().split('T')[0],
    companyName: 'SMS Diagnostics',
    companyAddress: '18-1-30/9, Opp. KGH OP Gate, Aditya Complex, Visakhapatnam, Andhra Pradesh 530002',
    companyContact: '+91-905 933 1954 / 0891-2751954',
    companyEmail: 'admin@smslabs.in',
    title: 'Mr.',
    employeeName: 'Employee Name',
    designation: 'Staff',
    department: 'Operations',
    joiningDate: new Date().toISOString().split('T')[0],
    isCurrentlyEmployed: true,
    tenureDuration: '1 year',
    documentTitle: 'TO WHOMSOEVER IT MAY CONCERN',
    openingParagraph: 'This is to certify that Mr. Employee Name has been employed with SMS Diagnostics.',
    tenureParagraph: 'During their tenure, they have successfully served in the capacity of Staff.',
    conductParagraph: 'We have found him to be a dedicated, hardworking, and reliable employee.',
    closingParagraph: 'We wish him success in all future endeavors.',
    signatoryEntity: 'For SMS Diagnostics',
    signatoryName: 'Suresh Kumar. R',
    signatoryDepartment: 'Managing Director'
  });

  const formattedIssueDate = formatDisplayDate(data.issueDate);

  return (
    <div
      ref={ref}
      id="printable-experience-letter"
      className="bg-white p-8 sm:p-14 max-w-4xl mx-auto min-h-[1056px] shadow-sm print:shadow-none print:p-0 relative font-serif text-slate-800 border border-slate-200/80 rounded-2xl print:border-none print:rounded-none"
    >
      {/* Print-specific style rules */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          body {
            background: #ffffff !important;
          }
          body * {
            visibility: hidden;
          }
          #printable-experience-letter, #printable-experience-letter * {
            visibility: visible;
          }
          #printable-experience-letter {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            min-height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      {/* Static Header (Letterhead Template) */}
      <div className="border-b-4 border-teal-700 pb-6 mb-10 flex justify-between items-start gap-4">
        <div className="flex items-center gap-4">
          <SmsLogo textSize="text-3xl font-black" subtitle={true} />
        </div>
        <div className="text-right text-xs sm:text-sm text-slate-600 leading-snug">
          <p className="font-bold text-teal-800 text-sm sm:text-base">Registered Office</p>
          <p>{data.companyAddress}</p>
          <p>Contact: {data.companyContact}</p>
          <p>Email: {data.companyEmail}</p>
        </div>
      </div>

      {/* Letter Meta */}
      <div className="space-y-8 leading-relaxed">
        <div className="flex justify-between font-bold text-xs sm:text-sm text-slate-800">
          <p>Ref: <span className="font-mono">{data.referenceNo}</span></p>
          <p>Date: <span>{formattedIssueDate}</span></p>
        </div>

        {/* Title */}
        <h1 className="text-xl sm:text-2xl font-bold text-center underline uppercase tracking-widest my-8 text-slate-900">
          {data.documentTitle || 'TO WHOMSOEVER IT MAY CONCERN'}
        </h1>

        {/* Letter Body Paragraphs */}
        <div className="space-y-6 text-justify text-sm sm:text-base text-slate-800">
          <p className="leading-relaxed">
            {data.openingParagraph}
          </p>

          <p className="leading-relaxed">
            {data.tenureParagraph}
          </p>

          <p className="leading-relaxed">
            {data.conductParagraph}
          </p>

          <p className="leading-relaxed">
            {data.closingParagraph}
          </p>
        </div>

        {/* Signature Block */}
        <div className="pt-16 sm:pt-20 space-y-2">
          <p className="text-sm font-semibold">{data.signatoryEntity}</p>
          <div className="h-16 flex items-center">
            {/* Signature Stamp placeholder */}
            <div className="text-[10px] uppercase font-mono tracking-wider text-teal-700/60 border border-dashed border-teal-600/40 px-3 py-1.5 rounded-lg inline-block print:hidden">
              [Authorized Signature & Seal]
            </div>
          </div>
          <p className="font-bold text-sm sm:text-base text-slate-900">{data.signatoryName}</p>
          <p className="text-xs sm:text-sm text-slate-600">{data.signatoryDepartment}</p>
        </div>
      </div>

      {/* Footer / Watermark */}
      <div className="absolute bottom-8 left-0 right-0 text-center text-[10px] text-slate-400 border-t border-slate-200 pt-4 px-12">
        This is a computer-generated document issued by {data.companyName}. No signature is required.
      </div>
    </div>
  );
});

export default ExperienceLetter;

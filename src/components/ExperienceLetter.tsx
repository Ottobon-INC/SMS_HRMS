import React, { forwardRef } from 'react';
import { Employee, Language } from '../types';
import { ExperienceLetterData } from '../types/document.types';
import { generateDefaultLetter, formatDisplayDate } from '../lib/services/experience-letter-service';

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
      className="bg-white max-w-4xl mx-auto shadow-md print:shadow-none relative font-serif text-slate-800 border border-slate-200/80 rounded-2xl print:border-none print:rounded-none overflow-hidden"
      style={{
        backgroundImage: "url('/experience_letterhead.png')",
        backgroundSize: "100% 100%",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center top",
        aspectRatio: "210 / 297",
        paddingTop: "22%",
        paddingLeft: "10%",
        paddingRight: "10%",
        paddingBottom: "12%",
        boxSizing: "border-box"
      }}
    >
      {/* Print-specific style rules */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden;
          }
          #printable-experience-letter, #printable-experience-letter * {
            visibility: visible;
          }
          #printable-experience-letter {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            padding-top: 55mm !important;
            padding-left: 24mm !important;
            padding-right: 24mm !important;
            padding-bottom: 30mm !important;
            margin: 0 !important;
            box-sizing: border-box !important;
            background-image: url('/experience_letterhead.png') !important;
            background-size: 100% 100% !important;
            background-repeat: no-repeat !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
        }
      `}</style>

      {/* Letter Content Overlay on Official Letterhead */}
      <div className="space-y-6 sm:space-y-8 leading-relaxed relative z-10">
        <div className="flex justify-between font-bold text-xs sm:text-sm text-slate-800">
          <p>Ref: <span className="font-mono">{data.referenceNo}</span></p>
          <p>Date: <span>{formattedIssueDate}</span></p>
        </div>

        {/* Title */}
        <h1 className="text-xl sm:text-2xl font-bold text-center underline uppercase tracking-widest my-6 sm:my-8 text-slate-900">
          {data.documentTitle || 'TO WHOMSOEVER IT MAY CONCERN'}
        </h1>

        {/* Letter Body Paragraphs */}
        <div className="space-y-5 sm:space-y-6 text-justify text-xs sm:text-sm md:text-base text-slate-800">
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
        <div className="pt-10 sm:pt-14 space-y-1.5">
          <p className="text-xs sm:text-sm font-semibold">{data.signatoryEntity}</p>
          <div className="h-14 sm:h-16 flex items-center">
            {/* Signature Stamp placeholder */}
            <div className="text-[10px] uppercase font-mono tracking-wider text-teal-700/60 border border-dashed border-teal-600/40 px-3 py-1.5 rounded-lg inline-block print:hidden">
              [Authorized Signature & Seal]
            </div>
          </div>
          <p className="font-bold text-sm sm:text-base text-slate-900">{data.signatoryName}</p>
          <p className="text-xs sm:text-sm text-slate-600">{data.signatoryDepartment}</p>
        </div>
      </div>
    </div>
  );
});

export default ExperienceLetter;

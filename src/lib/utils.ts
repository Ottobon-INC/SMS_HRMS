import { translations } from '../translations';
import { Language } from '../types';

export function numberToWords(num: number): string {
  const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
  const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];

  let numStr = num.toString();
  if (numStr.length > 9) return 'overflow';
  let n = ('000000000' + numStr).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return ''; 
  let str = '';
  str += (Number(n[1]) !== 0) ? (a[Number(n[1])] || b[Number(n[1][0])] + ' ' + a[Number(n[1][1])]) + 'Crore ' : '';
  str += (Number(n[2]) !== 0) ? (a[Number(n[2])] || b[Number(n[2][0])] + ' ' + a[Number(n[2][1])]) + 'Lakh ' : '';
  str += (Number(n[3]) !== 0) ? (a[Number(n[3])] || b[Number(n[3][0])] + ' ' + a[Number(n[3][1])]) + 'Thousand ' : '';
  str += (Number(n[4]) !== 0) ? (a[Number(n[4])] || b[Number(n[4][0])] + ' ' + a[Number(n[4][1])]) + 'Hundred ' : '';
  str += (Number(n[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[Number(n[5][0])] + ' ' + a[Number(n[5][1])]) : '';
  return str.trim() + ' Rupees only';
}

export function generateMonthOptions(startYear: number, startMonth: number): string[] {
  const options: string[] = [];
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // 1-12

  for (let year = currentYear; year >= startYear; year--) {
    const endMonth = 12; // Always show all 12 months, allowing future planning up to Dec
    const beginMonth = year === startYear ? startMonth : 1;

    for (let month = endMonth; month >= beginMonth; month--) {
      const monthStr = month < 10 ? `0${month}` : `${month}`;
      options.push(`${year}-${monthStr}`);
    }
  }

  return options;
}

export function formatMonth(monthString: string, language: Language): string {
  if (!monthString) return '';
  const parts = monthString.split('-');
  if (parts.length !== 2) return monthString;
  
  const year = parts[0];
  const monthNum = parseInt(parts[1], 10);
  
  const monthKeys = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  
  const monthKey = monthKeys[monthNum - 1];
  const translatedMonth = translations[language][monthKey] || monthKey;
  
  return `${translatedMonth} ${year}`;
}

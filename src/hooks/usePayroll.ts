import { Employee, Payslip } from '../types';
import * as payrollService from '../lib/services/payroll-service';

export function usePayroll(isLocalMode: boolean, loadData: () => Promise<void>) {
  const runBulkPayroll = async (employees: Employee[], month: string) => {
    if (isLocalMode) {
      alert("Payroll generation requires an online database connection.");
      return;
    }
    await payrollService.runBulkPayrollForMonth(employees, month);
    await loadData();
  };

  const updatePayslip = async (empId: string, payslip: Payslip) => {
    if (isLocalMode) {
      alert("Payslip updates require an online database connection.");
      return;
    }
    await payrollService.savePayslipToSupabase(empId, payslip);
    await loadData();
  };

  const generateSinglePayslip = async (empId: string, month: string, basicPay: number) => {
    if (isLocalMode) {
      alert("Payslip updates require an online database connection.");
      return;
    }
    const hraAmt = Math.round(basicPay * 0.4);
    const medAmt = 3000;
    const convAmt = 4000;
    const pfAmt = Math.round(basicPay * 0.12);
    const profTax = 200;
    const incomeTax = Math.round(basicPay * 0.07);

    const payslip: Payslip = {
      id: `PS-${month}-${empId.slice(-3)}`,
      month,
      basicPay: basicPay,
      allowances: [
        { nameKey: 'hra', amount: hraAmt },
        { nameKey: 'medicalAllow', amount: medAmt },
        { nameKey: 'conveyanceAllow', amount: convAmt }
      ],
      deductions: [
        { nameKey: 'providentFund', amount: pfAmt },
        { nameKey: 'professionalTax', amount: profTax },
        { nameKey: 'incomeTax', amount: incomeTax }
      ]
    };

    await payrollService.savePayslipToSupabase(empId, payslip);
    await loadData();
  };

  return {
    runBulkPayroll,
    updatePayslip,
    generateSinglePayslip
  };
}

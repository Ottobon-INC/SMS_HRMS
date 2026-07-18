import { Employee, Payslip } from '../types';
import * as payrollService from '../lib/services/payroll-service';
import { supabase } from '../lib/supabase-client';

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

  const generateSinglePayslip = async (empId: string, month: string, basicPay: number, hasExisting: boolean, approvedAdvances: { id: string, amount: number }[]) => {
    if (isLocalMode) {
      alert("Payslip updates require an online database connection.");
      return;
    }
    
    if (hasExisting) {
      const confirmOverride = window.confirm("A payslip already exists for this month. Generating a new one will overwrite any custom edits. Do you want to proceed?");
      if (!confirmOverride) return;
    }

    let advanceTotal = 0;
    for (const adv of approvedAdvances) {
      advanceTotal += adv.amount;
      await supabase
        .from('HRMS_advance_requests')
        .update({ 
          status: 'deducted', 
          deducted_in_month: month 
        })
        .eq('id', adv.id);
    }

    const hraAmt = Math.round(basicPay * 0.4);
    const medAmt = 3000;
    const convAmt = 4000;
    const pfAmt = Math.round(basicPay * 0.12);
    const profTax = 200;

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
        { nameKey: 'professionalTax', amount: profTax }
      ],
      advanceMoneyTaken: advanceTotal > 0,
      advanceMoneyAmount: advanceTotal
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

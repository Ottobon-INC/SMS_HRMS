import { supabase } from '../supabase-client';
import { Employee, Payslip } from '../../types';

export async function savePayslipToSupabase(empId: string, payslip: Payslip): Promise<void> {
  let totalDeductions = payslip.deductions.reduce((sum, d) => sum + d.amount, 0);
  if (payslip.advanceMoneyTaken && payslip.advanceMoneyAmount) {
    totalDeductions += payslip.advanceMoneyAmount;
  }

  const netPay = payslip.basicPay + 
    payslip.allowances.reduce((sum, a) => sum + a.amount, 0) - 
    totalDeductions;

  const { data: existing } = await supabase
    .from('HRMS_payroll')
    .select('id')
    .eq('employee_id', empId)
    .eq('month', payslip.month)
    .maybeSingle();

  const payload = {
    employee_id: empId,
    month: payslip.month,
    basic_pay: payslip.basicPay,
    allowances: payslip.allowances,
    deductions: payslip.deductions,
    net_pay: netPay,
    advance_money_taken: payslip.advanceMoneyTaken || false,
    advance_money_amount: payslip.advanceMoneyAmount || 0
  };

  if (existing) {
    const { error } = await supabase
      .from('HRMS_payroll')
      .update(payload)
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('HRMS_payroll')
      .insert([payload]);
    if (error) throw error;
  }
}

export async function runBulkPayrollForMonth(employees: Employee[], month: string): Promise<void> {
  for (const emp of employees) {
    if (emp.role === 'admin') continue; // typically admins skip bulk, but optional
    const basic = emp.basicSalary;
    const allowances = [
      { nameKey: 'hra', amount: Math.round(basic * 0.4) },
      { nameKey: 'medicalAllow', amount: 3000 },
      { nameKey: 'conveyanceAllow', amount: 4000 }
    ];
    const deductions = [
      { nameKey: 'providentFund', amount: Math.round(basic * 0.12) },
      { nameKey: 'professionalTax', amount: 200 },
      { nameKey: 'incomeTax', amount: Math.round(basic * 0.07) }
    ];

    const existingPayslip = emp.payslips.find(p => p.month === month);

    const payslip: Payslip = {
      id: `PS-${emp.id}-${month}`,
      month,
      basicPay: basic,
      allowances,
      deductions,
      advanceMoneyTaken: existingPayslip?.advanceMoneyTaken || false,
      advanceMoneyAmount: existingPayslip?.advanceMoneyAmount || 0
    };

    await savePayslipToSupabase(emp.id, payslip);
  }
}

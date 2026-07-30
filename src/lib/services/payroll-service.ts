import { supabase } from '../supabase-client';
import { Employee, Payslip } from '../../types';
import { decrementInstallment } from './advance-service';
import { fetchPayrollConfig, PayrollConfig } from './payroll-config-service';
import { computeAttendanceStats } from '../utils/attendance-stats';

export function getTieredAllowances(basicSalary: number, config: PayrollConfig) {
  if (basicSalary < 10000) {
    return {
      hra: config.tier1_hra ?? 2000,
      ma: config.tier1_ma ?? 1500,
      ca: config.tier1_ca ?? 1000,
    };
  } else if (basicSalary === 10000) {
    return {
      hra: config.tier2_hra ?? 3000,
      ma: config.tier2_ma ?? 2000,
      ca: config.tier2_ca ?? 1500,
    };
  } else {
    return {
      hra: config.tier3_hra ?? 4800,
      ma: config.tier3_ma ?? 2000,
      ca: config.tier3_ca ?? 1500,
    };
  }
}

export async function savePayslipToSupabase(empId: string, payslip: Payslip): Promise<void> {
  let totalDeductions = payslip.deductions.reduce((sum, d) => sum + d.amount, 0);
  
  // Only add advanceMoneyAmount to totalDeductions if it's NOT already in the deductions array.
  // This preserves backwards compatibility with older payslips.
  const hasAdvanceInDeductions = payslip.deductions.some(d => d.nameKey === 'advanceInstallment');
  if (payslip.advanceMoneyTaken && payslip.advanceMoneyAmount && !hasAdvanceInDeductions) {
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
    advance_money_amount: payslip.advanceMoneyAmount || 0,
    working_days: payslip.workingDays ?? null,
    days_present: payslip.daysPresent ?? null,
    leaves_taken: payslip.leavesTaken ?? null
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
  // Fetch dynamic config from DB (or use defaults on failure)
  const config = await fetchPayrollConfig();

  for (const emp of employees) {
    if (emp.role === 'admin') continue;
    const basic = emp.basicSalary;

    // Use dynamic tiered allowances per policy based on basic salary
    const tier = getTieredAllowances(basic, config);
    const allowances = [
      { nameKey: 'hra', amount: tier.hra },
      { nameKey: 'medicalAllow', amount: tier.ma },
      { nameKey: 'conveyanceAllow', amount: tier.ca }
    ];

    const deductions: { nameKey: string; amount: number }[] = [
      { nameKey: 'providentFund', amount: Math.round(basic * (config.pf_percent / 100)) },
      { nameKey: 'professionalTax', amount: config.professional_tax }
    ];

    const existingPayslip = emp.payslips.find(p => p.month === month);
    if (existingPayslip) {
      // If the existing payslip is missing the new attendance stats, automatically regenerate it
      if (existingPayslip.workingDays === undefined || existingPayslip.workingDays === null) {
        console.log(`Regenerating incomplete payslip for ${emp.name}`);
      } else {
        continue; // Don't overwrite manually edited payslips that are complete
      }
    }
    // Installment-based advance deduction
    // Only deduct active advances with installments remaining
    const activeAdvances = (emp.advanceRequests || []).filter(
      a => a.status === 'approved' && (a.installmentsRemaining ?? 0) > 0
    );

    let advanceInstallmentTotal = 0;
    const advanceIds: string[] = [];

    for (const adv of activeAdvances) {
      const installment = adv.monthlyInstallment ?? Math.ceil(adv.amount / (adv.repaymentMonths ?? 2));
      advanceInstallmentTotal += installment;
      advanceIds.push(adv.id);
      deductions.push({
        nameKey: adv.advanceType === 'medical' ? 'advanceInstallment_medical' : 'advanceInstallment_salary',
        amount: installment
      });
    }

    const stats = computeAttendanceStats(month, emp.attendanceRecords || [], emp.leaveRequests || []);

    const payslip: Payslip = {
      id: `PS-${emp.id}-${month}`,
      month,
      basicPay: basic,
      allowances,
      deductions,
      advanceMoneyTaken: advanceInstallmentTotal > 0,
      advanceMoneyAmount: advanceInstallmentTotal,
      workingDays: stats.workingDays,
      daysPresent: stats.daysPresent,
      leavesTaken: stats.leavesTaken
    };

    await savePayslipToSupabase(emp.id, payslip);

    // Decrement installments counter for each active advance
    for (const advId of advanceIds) {
      await decrementInstallment(advId);
    }
  }
}

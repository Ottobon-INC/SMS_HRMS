import { supabase } from '../supabase-client';
import { DB_TABLES } from '../../core/database.tables';
import { Employee, Payslip } from '../../types';
import { decrementInstallment } from './advance-service';
import { fetchPayrollConfig, PayrollConfig } from './payroll-config-service';
import { computeAttendanceStats } from '../utils/attendance-stats';

export function getTieredAllowances(basicSalary: number, config: PayrollConfig) {
  const tiers = config.payroll_tiers || [];
  
  // Find the first tier where basicSalary falls within [minSalary, maxSalary]
  const matchedTier = tiers.find(t => basicSalary >= t.minSalary && basicSalary <= t.maxSalary);
  
  if (matchedTier) {
    return {
      hra: matchedTier.hra,
      ma: matchedTier.ma,
      ca: matchedTier.ca,
    };
  }
  
  // Fallback to Tier 1 logic if no tier matches, or if tiers are empty
  return {
    hra: 2000,
    ma: 1500,
    ca: 1000,
  };
}

export async function savePayslipToSupabase(empId: string, payslip: Payslip): Promise<void> {
  let totalDeductions = payslip.deductions.reduce((sum, d) => sum + d.amount, 0);
  
  // Only add advanceMoneyAmount to totalDeductions if it's NOT already in the deductions array.
  // This preserves backwards compatibility with older payslips.
  const hasAdvanceInDeductions = payslip.deductions.some(d => d.nameKey === 'advanceInstallment');
  if (payslip.advanceMoneyTaken && payslip.advanceMoneyAmount && !hasAdvanceInDeductions) {
    totalDeductions += payslip.advanceMoneyAmount;
  }

  const netPay = Math.max(0, payslip.basicPay + 
    payslip.allowances.reduce((sum, a) => sum + a.amount, 0) - 
    totalDeductions);

  const { data: existing } = await supabase
    .from(DB_TABLES.PAYROLL)
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
      .from(DB_TABLES.PAYROLL)
      .update(payload)
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from(DB_TABLES.PAYROLL)
      .insert([payload]);
    if (error) throw error;
  }
}

export async function runBulkPayrollForMonth(employees: Employee[], month: string): Promise<void> {
  if (!Array.isArray(employees) || !month) {
    console.warn("runBulkPayrollForMonth called with invalid arguments", { employees, month });
    return;
  }
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

    const stats = computeAttendanceStats(month, emp.attendanceRecords || [], emp.leaveRequests || [], emp.joiningDate, emp.missedPunchRequests || []);
    const dailyPay = stats.workingDays > 0 ? (basic / stats.workingDays) : 0;

    const existingPayslip = (emp.payslips || []).find(p => p.month === month);
    if (existingPayslip) {
      const existingLop = (existingPayslip.deductions || []).find(d => d.nameKey === 'lossOfPay')?.amount ?? 0;
      const expectedLop = stats.lopDays > 0 ? Math.round(stats.lopDays * 1 * dailyPay) : 0;
      const existingAbsent = (existingPayslip.deductions || []).find(d => d.nameKey === 'absentPenalty')?.amount ?? 0;
      const expectedAbsent = stats.absentDays > 0 ? Math.round(stats.absentDays * 2 * dailyPay) : 0;
      const existingMissed = (existingPayslip.deductions || []).find(d => d.nameKey === 'missedPunchPenalty')?.amount ?? 0;
      const expectedMissed = (stats.missedPunchPenaltyHalfDays || 0) > 0 ? Math.round(stats.missedPunchPenaltyHalfDays * 0.5 * dailyPay) : 0;

      const isOutOfSync = 
        existingPayslip.workingDays !== stats.workingDays ||
        existingPayslip.daysPresent !== stats.daysPresent ||
        existingPayslip.paidLeaves !== stats.paidLeaves ||
        existingPayslip.lopDays !== stats.lopDays ||
        existingPayslip.absentDays !== stats.absentDays ||
        existingPayslip.halfDays !== stats.halfDays ||
        existingLop !== expectedLop ||
        existingAbsent !== expectedAbsent ||
        existingMissed !== expectedMissed;

      if (!isOutOfSync) {
        continue; // Payslip is already fully up-to-date
      }
      console.log(`Updating out-of-sync payslip for ${emp.name} (${month})`);
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

    // Loss of Pay (LOP) deduction: 1 day salary cut per approved LOP day
    if (stats.lopDays > 0) {
      deductions.push({
        nameKey: 'lossOfPay',
        amount: Math.round(stats.lopDays * 1 * dailyPay)
      });
    }

    // Absent Penalty deduction: 2 days salary cut per unapproved absent day
    if (stats.absentDays > 0) {
      deductions.push({
        nameKey: 'absentPenalty',
        amount: Math.round(stats.absentDays * 2 * dailyPay)
      });
    }

    // Missed Punch Penalty deduction: 0.5 day cut per penalty half day
    if ((stats.missedPunchPenaltyHalfDays || 0) > 0) {
      deductions.push({
        nameKey: 'missedPunchPenalty',
        amount: Math.round(stats.missedPunchPenaltyHalfDays * 0.5 * dailyPay)
      });
    }

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
      leavesTaken: stats.leavesTaken,
      paidLeaves: stats.paidLeaves,
      lopDays: stats.lopDays,
      absentDays: stats.absentDays,
      halfDays: stats.halfDays
    };

    await savePayslipToSupabase(emp.id, payslip);

    // Decrement installments counter for each active advance only if this was a new payslip
    if (!existingPayslip) {
      for (const advId of advanceIds) {
        await decrementInstallment(advId);
      }
    }
  }
}

import { supabase } from '../supabase-client';
import { LeaveRequest, LeaveType } from '../../types';

export async function submitLeaveRequest(empId: string, leave: Omit<LeaveRequest, 'id'>): Promise<void> {
  const from = new Date(leave.fromDate);
  const to = new Date(leave.toDate);
  const diffDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 3600 * 24)) + 1;
  
  if (leave.type === 'sick' || leave.type === 'casual') {
    if (diffDays > 3) {
      throw new Error("Continuous leave cannot exceed 3 days for this leave type.");
    }
  } else if (leave.type === 'maternity' && diffDays > 90) {
    throw new Error("Maternity leave cannot exceed 90 days.");
  } else if (leave.type === 'paternity' && diffDays > 7) {
    throw new Error("Paternity leave cannot exceed 7 days.");
  }

  const { error } = await supabase
    .from('HRMS_leave_requests')
    .insert([{
      employee_id: empId,
      leave_type: leave.type,
      from_date: leave.fromDate,
      to_date: leave.toDate,
      reason: leave.reason,
      status: 'Pending'
    }]);

  if (error) throw error;
}

export async function updateLeaveRequestStatus(requestId: string, status: 'Approved' | 'Rejected', adminNote?: string): Promise<void> {
  const { data: request, error: fetchErr } = await supabase
    .from('HRMS_leave_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (fetchErr) throw fetchErr;

  const { error } = await supabase
    .from('HRMS_leave_requests')
    .update({ status: status, admin_note: adminNote || '' })
    .eq('id', requestId);

  if (error) throw error;

  if (status === 'Approved' && request) {
    const from = new Date(request.from_date);
    const to = new Date(request.to_date);
    const diffDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 3600 * 24)) + 1;

    const { data: balance } = await supabase
      .from('HRMS_leave_balances')
      .select('*')
      .eq('employee_id', request.employee_id)
      .eq('leave_type', request.leave_type)
      .maybeSingle();

    if (balance) {
      await supabase
        .from('HRMS_leave_balances')
        .update({ used: Number(balance.used || 0) + diffDays })
        .eq('id', balance.id);
    } else {
      let allotted = 0;
      if (request.leave_type === 'sick') allotted = 6;
      else if (request.leave_type === 'casual') allotted = 8;
      else if (request.leave_type === 'maternity') allotted = 90;
      else if (request.leave_type === 'paternity') allotted = 7;

      await supabase
        .from('HRMS_leave_balances')
        .insert([{
          employee_id: request.employee_id,
          leave_type: request.leave_type,
          total_allotted: allotted,
          used: diffDays
        }]);
    }

    let current = new Date(from);
    const end = new Date(to);
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const { data: att } = await supabase
        .from('HRMS_attendance')
        .select('id')
        .eq('employee_id', request.employee_id)
        .eq('date', dateStr)
        .maybeSingle();

      if (att) {
        await supabase
          .from('HRMS_attendance')
          .update({ status: 'Leave' })
          .eq('id', att.id);
      } else {
        await supabase
          .from('HRMS_attendance')
          .insert([{ employee_id: request.employee_id, date: dateStr, status: 'Leave' }]);
      }
      current.setDate(current.getDate() + 1);
    }
  }
}

export async function updateLeaveBalances(empId: string, leaveType: LeaveType, allotted: number, used: number): Promise<void> {
  const { data: balance, error: fetchErr } = await supabase
    .from('HRMS_leave_balances')
    .select('id')
    .eq('employee_id', empId)
    .eq('leave_type', leaveType)
    .maybeSingle();

  if (fetchErr) throw fetchErr;

  if (balance) {
    const { error } = await supabase
      .from('HRMS_leave_balances')
      .update({ total_allotted: allotted, used: used })
      .eq('id', balance.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('HRMS_leave_balances')
      .insert([{ employee_id: empId, leave_type: leaveType, total_allotted: allotted, used: used }]);
    if (error) throw error;
  }
}

export async function deductPenaltyLeave(empId: string, leaveType: LeaveType, penaltyDays: number): Promise<void> {
  const { data: balance, error: fetchErr } = await supabase
    .from('HRMS_leave_balances')
    .select('*')
    .eq('employee_id', empId)
    .eq('leave_type', leaveType)
    .maybeSingle();

  if (fetchErr) throw fetchErr;

  if (balance) {
    const { error } = await supabase
      .from('HRMS_leave_balances')
      .update({ used: Number(balance.used || 0) + penaltyDays })
      .eq('id', balance.id);
    if (error) throw error;
  } else {
    // If no record exists, create one with standard default allotted and the penalty as used
    let allotted = 0;
    if (leaveType === 'sick') allotted = 6;
    else if (leaveType === 'casual') allotted = 8;
    
    const { error } = await supabase
      .from('HRMS_leave_balances')
      .insert([{ employee_id: empId, leave_type: leaveType, total_allotted: allotted, used: penaltyDays }]);
    if (error) throw error;
  }
}

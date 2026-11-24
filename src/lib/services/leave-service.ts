import { supabase } from '../supabase-client';
import { DB_TABLES } from '../../core/database.tables';
import { LeaveRequest, LeaveType } from '../../types';

export async function submitLeaveRequest(empId: string, leave: Omit<LeaveRequest, 'id'>): Promise<void> {
  const from = new Date(leave.fromDate);
  const to = new Date(leave.toDate);
  const diffDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 3600 * 24)) + 1;
  
  if (['casual', 'sick', 'monthly', 'lop', 'weekoff'].includes(leave.type)) {
    if (leave.type === 'weekoff' && diffDays > 2) {
      throw new Error("Week off cannot be applied for more than 2 consecutive days.");
    } else if (diffDays > 3) {
      throw new Error("Continuous leave cannot exceed 3 days. Longer leaves must be approved separately or marked as Absent.");
    }
  } else if (leave.type === 'maternity' || leave.type === 'maternity_unpaid') {
    if (diffDays > 90) {
      throw new Error("Maternity leave cannot exceed 90 days.");
    }
  } else if (leave.type === 'paternity') {
    if (diffDays > 7) {
      throw new Error("Paternity leave can only be applied for up to 7 consecutive days at a time. After 7 days, you can re-apply for remaining days.");
    }
  }

  // Anti-Spam & Overlap Check: Block duplicate submissions for the same dates
  const { data: existingRequests, error: checkErr } = await supabase
    .from(DB_TABLES.LEAVE_REQUESTS)
    .select('id, from_date, to_date, status, leave_type')
    .eq('employee_id', empId)
    .in('status', ['Pending', 'Approved', 'pending', 'approved']);

  if (checkErr) throw checkErr;

  if (existingRequests && existingRequests.length > 0) {
    const reqFrom = from.getTime();
    const reqTo = to.getTime();

    for (const ex of existingRequests) {
      const exFrom = new Date(ex.from_date).getTime();
      const exTo = new Date(ex.to_date).getTime();

      // Overlap collision detected
      if (reqFrom <= exTo && reqTo >= exFrom) {
        throw new Error(
          `You already have a leave request (${ex.status}) covering ${ex.from_date} to ${ex.to_date}. If you wish to re-apply, please cancel/delete your pending request first.`
        );
      }
    }
  }

  const { error } = await supabase
    .from(DB_TABLES.LEAVE_REQUESTS)
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

/** Cancel / Delete a pending leave request so employee can re-apply */
export async function deleteLeaveRequest(requestId: string, empId?: string): Promise<void> {
  let query = supabase
    .from(DB_TABLES.LEAVE_REQUESTS)
    .delete()
    .eq('id', requestId)
    .in('status', ['Pending', 'pending']);

  if (empId) {
    query = query.eq('employee_id', empId);
  }

  const { error } = await query;
  if (error) throw error;
}

export async function updateLeaveRequestStatus(requestId: string, status: 'Approved' | 'Rejected', adminNote?: string): Promise<void> {
  const { data: request, error: fetchErr } = await supabase
    .from(DB_TABLES.LEAVE_REQUESTS)
    .select('*')
    .eq('id', requestId)
    .single();

  if (fetchErr) throw fetchErr;

  const { error } = await supabase
    .from(DB_TABLES.LEAVE_REQUESTS)
    .update({ status: status, admin_note: adminNote || '' })
    .eq('id', requestId);

  if (error) throw error;

  if (status === 'Approved' && request) {
    const from = new Date(request.from_date);
    const to = new Date(request.to_date);
    const diffDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 3600 * 24)) + 1;

    if (request.leave_type === 'monthly') {
      const monthStr = request.from_date.substring(0, 7); // YYYY-MM
      // Ensure the row exists or initialize it
      const { data: quota } = await supabase
        .from(DB_TABLES.MONTHLY_LEAVE_QUOTA)
        .select('*')
        .eq('employee_id', request.employee_id)
        .eq('month', monthStr)
        .maybeSingle();

      if (quota) {
        await supabase
          .from(DB_TABLES.MONTHLY_LEAVE_QUOTA)
          .update({ used: Number(quota.used || 0) + diffDays })
          .eq('id', quota.id);
      } else {
        await supabase
          .from(DB_TABLES.MONTHLY_LEAVE_QUOTA)
          .insert([{
            employee_id: request.employee_id,
            month: monthStr,
            allotted: 1,
            used: diffDays
          }]);
      }
    } else {
      const { data: balance } = await supabase
        .from(DB_TABLES.LEAVE_BALANCES)
        .select('*')
        .eq('employee_id', request.employee_id)
        .eq('leave_type', request.leave_type)
        .maybeSingle();

      if (balance) {
        await supabase
          .from(DB_TABLES.LEAVE_BALANCES)
          .update({ used: Number(balance.used || 0) + diffDays })
          .eq('id', balance.id);
      } else {
        let allotted = 0;
        if (request.leave_type === 'sick') allotted = 1;
        else if (request.leave_type === 'casual') allotted = 1;
        else if (request.leave_type === 'maternity' || request.leave_type === 'maternity_unpaid') allotted = 90;
        else if (request.leave_type === 'paternity') allotted = 15;
        else if (request.leave_type === 'lop') allotted = 0;

        await supabase
          .from(DB_TABLES.LEAVE_BALANCES)
          .insert([{
            employee_id: request.employee_id,
            leave_type: request.leave_type,
            total_allotted: allotted,
            used: diffDays
          }]);
      }
    }

    // Auto-sync approved leave into Attendance table
    const [startYear, startMonth, startDay] = request.from_date.split('-').map(Number);
    const [endYear, endMonth, endDay] = request.to_date.split('-').map(Number);
    const cur = new Date(startYear, startMonth - 1, startDay);
    const end = new Date(endYear, endMonth - 1, endDay);

    const isWeekoff = request.leave_type === 'weekoff';
    const targetStatus = isWeekoff ? 'weekoff' : 'leave';
    const targetNote = isWeekoff ? 'Approved Week Off' : `Approved Leave: ${request.leave_type}`;

    while (cur <= end) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;

      const { data: att } = await supabase
        .from(DB_TABLES.ATTENDANCE)
        .select('id')
        .eq('employee_id', request.employee_id)
        .eq('date', dateStr)
        .maybeSingle();

      if (att) {
        await supabase
          .from(DB_TABLES.ATTENDANCE)
          .update({ 
            status: targetStatus,
            punch_note: targetNote
          })
          .eq('id', att.id);
      } else {
        await supabase
          .from(DB_TABLES.ATTENDANCE)
          .insert([{ 
            employee_id: request.employee_id, 
            date: dateStr, 
            status: targetStatus,
            punch_note: targetNote
          }]);
      }
      cur.setDate(cur.getDate() + 1);
    }
  }
}

export async function updateLeaveBalances(empId: string, leaveType: LeaveType, allotted: number, used: number): Promise<void> {
  if (leaveType === 'monthly') {
    const currentMonth = new Date().toISOString().substring(0, 7);
    const { data: quota } = await supabase
      .from(DB_TABLES.MONTHLY_LEAVE_QUOTA)
      .select('id')
      .eq('employee_id', empId)
      .eq('month', currentMonth)
      .maybeSingle();
      
    if (quota) {
      await supabase
        .from(DB_TABLES.MONTHLY_LEAVE_QUOTA)
        .update({ allotted, used })
        .eq('id', quota.id);
    } else {
      await supabase
        .from(DB_TABLES.MONTHLY_LEAVE_QUOTA)
        .insert([{ employee_id: empId, month: currentMonth, allotted, used }]);
    }
    return;
  }

  const { data: balance, error: fetchErr } = await supabase
    .from(DB_TABLES.LEAVE_BALANCES)
    .select('id')
    .eq('employee_id', empId)
    .eq('leave_type', leaveType)
    .maybeSingle();

  if (fetchErr) throw fetchErr;

  if (balance) {
    const { error } = await supabase
      .from(DB_TABLES.LEAVE_BALANCES)
      .update({ total_allotted: allotted, used: used })
      .eq('id', balance.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from(DB_TABLES.LEAVE_BALANCES)
      .insert([{ employee_id: empId, leave_type: leaveType, total_allotted: allotted, used: used }]);
    if (error) throw error;
  }
}

export async function deductPenaltyLeave(empId: string, leaveType: LeaveType, penaltyDays: number): Promise<void> {
  const { data: balance, error: fetchErr } = await supabase
    .from(DB_TABLES.LEAVE_BALANCES)
    .select('*')
    .eq('employee_id', empId)
    .eq('leave_type', leaveType)
    .maybeSingle();

  if (fetchErr) throw fetchErr;

  if (balance) {
    const { error } = await supabase
      .from(DB_TABLES.LEAVE_BALANCES)
      .update({ used: Number(balance.used || 0) + penaltyDays })
      .eq('id', balance.id);
    if (error) throw error;
  } else {
    // If no record exists, create one with standard default allotted and the penalty as used
    let allotted = 0;
    if (leaveType === 'sick') allotted = 1;
    else if (leaveType === 'casual') allotted = 1;
    
    const { error } = await supabase
      .from(DB_TABLES.LEAVE_BALANCES)
      .insert([{ employee_id: empId, leave_type: leaveType, total_allotted: allotted, used: penaltyDays }]);
    if (error) throw error;
  }
}

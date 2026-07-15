import { supabase } from '../supabase-client';

export async function submitAdvanceRequest(empId: string, amount: number, reason: string): Promise<void> {
  const { error } = await supabase
    .from('HRMS_advance_requests')
    .insert([{
      employee_id: empId,
      amount,
      reason,
      status: 'pending'
    }]);

  if (error) throw error;
}

export async function approveAdvance(requestId: string): Promise<void> {
  const { error } = await supabase
    .from('HRMS_advance_requests')
    .update({ 
      status: 'approved',
      approved_at: new Date().toISOString()
    })
    .eq('id', requestId);

  if (error) throw error;
}

export async function rejectAdvance(requestId: string): Promise<void> {
  const { error } = await supabase
    .from('HRMS_advance_requests')
    .update({ status: 'rejected' })
    .eq('id', requestId);

  if (error) throw error;
}

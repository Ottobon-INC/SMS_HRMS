import { supabase } from '../supabase-client';
import { Invoice } from '../../types';

export async function fetchInvoices(): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('HRMS_invoices')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!data) return [];

  return data.map(inv => ({
    id: inv.id,
    invoiceNumber: inv.invoice_number,
    issueDate: inv.created_at ? inv.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
    dueDate: inv.due_date || new Date().toISOString().split('T')[0],
    senderName: 'SMS Diagnostics',
    senderDetails: '#18-1-30/9, Opp. KGH OP Gate, Aditya Complex, Vishakapatnam-02\nPhone: 9059331954 / 08912751954\nEmail: info@smslabs.in / ops@dlabsfield.in\nWebsite: www.smslabs.in',
    clientName: inv.client_name,
    clientDetails: inv.client_details,
    items: Array.isArray(inv.items) ? inv.items : [],
    taxPercent: inv.tax_percent !== undefined ? inv.tax_percent : 18
  }));
}

export async function saveInvoiceToSupabase(invoice: Omit<Invoice, 'id'> & { id?: string }, adminId: string): Promise<Invoice> {
  const payload = {
    invoice_number: invoice.invoiceNumber,
    client_name: invoice.clientName,
    client_details: invoice.clientDetails,
    items: invoice.items,
    total: invoice.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0),
    payable_amount: invoice.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0) * (1 + (invoice.taxPercent / 100)),
    created_by: adminId,
    due_date: invoice.dueDate,
    tax_percent: invoice.taxPercent
  };

  if (invoice.id && invoice.id !== 'new' && !invoice.id.startsWith('temp-')) {
    const { data, error } = await supabase
      .from('HRMS_invoices')
      .update(payload)
      .eq('id', invoice.id)
      .select()
      .single();

    if (error) throw error;
    return { ...invoice, id: data.id };
  } else {
    const { data, error } = await supabase
      .from('HRMS_invoices')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return {
      ...invoice,
      id: data.id,
      issueDate: data.created_at ? data.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
    };
  }
}

export async function deleteInvoiceFromSupabase(id: string): Promise<void> {
  const { error } = await supabase
    .from('HRMS_invoices')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

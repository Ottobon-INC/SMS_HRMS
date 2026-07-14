import { useState, useCallback, useEffect } from 'react';
import { Invoice } from '../types';
import * as invoiceService from '../lib/services/invoice-service';
import { initialInvoices } from '../data';

export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLocalMode, setIsLocalMode] = useState<boolean>(false);

  const saveLocalData = (invs: Invoice[]) => {
    localStorage.setItem('hrms_local_invoices', JSON.stringify(invs));
  };

  const loadData = useCallback(async () => {
    try {
      const invs = await invoiceService.fetchInvoices();
      setInvoices(invs);
      setIsLocalMode(false);
      saveLocalData(invs);
    } catch (err) {
      console.error('Error fetching invoices from Supabase, falling back to local mode:', err);
      const savedInvs = localStorage.getItem('hrms_local_invoices');
      let finalInvs: Invoice[] = [];
      if (savedInvs) {
        try {
          finalInvs = JSON.parse(savedInvs);
        } catch {
          finalInvs = initialInvoices;
        }
      } else {
        finalInvs = initialInvoices;
      }
      setInvoices(finalInvs);
      setIsLocalMode(true);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveInvoice = async (invoice: Omit<Invoice, 'id'> & { id?: string }, adminId: string) => {
    if (isLocalMode) {
      const newId = invoice.id && invoice.id !== 'new' ? invoice.id : `temp-${Date.now()}`;
      const payload: Invoice = {
        ...invoice,
        id: newId,
        issueDate: invoice.issueDate || new Date().toISOString().split('T')[0]
      };

      const updated = invoices.some(i => i.id === newId)
        ? invoices.map(i => i.id === newId ? payload : i)
        : [payload, ...invoices];
        
      setInvoices(updated);
      saveLocalData(updated);
      return;
    }
    
    await invoiceService.saveInvoiceToSupabase(invoice, adminId);
    await loadData();
  };

  const deleteInvoice = async (id: string) => {
    if (isLocalMode) {
      const updated = invoices.filter(i => i.id !== id);
      setInvoices(updated);
      saveLocalData(updated);
      return;
    }
    
    await invoiceService.deleteInvoiceFromSupabase(id);
    await loadData();
  };

  return {
    invoices,
    isLocalMode,
    loadData,
    saveInvoice,
    deleteInvoice
  };
}

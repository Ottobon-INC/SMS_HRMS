import React, { useState } from 'react';
import { Receipt, Plus, Trash2, Printer, Save, FileText, CheckCircle2 } from 'lucide-react';
import { Language, Invoice, InvoiceItem } from '../types';
import { translations } from '../translations';
import SmsLogo from './SmsLogo';

interface InvoiceModuleProps {
  language: Language;
  invoices: Invoice[];
  onSaveInvoice: (invoice: Invoice) => void;
  onDeleteInvoice?: (id: string) => void;
}

export default function InvoiceModule({ language, invoices, onSaveInvoice, onDeleteInvoice }: InvoiceModuleProps) {
  const t = translations[language];

  // Active / Selected invoice ID
  const [activeInvoiceId, setActiveInvoiceId] = useState(invoices[0]?.id || 'new');

  // Form local states for "New" invoice or editing
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-2026-0${42 + invoices.length}`);
  const [issueDate, setIssueDate] = useState('2026-07-13');
  const [dueDate, setDueDate] = useState('2026-07-28');
  const [senderName, setSenderName] = useState('SMS Diagnostics');
  const [senderDetails, setSenderDetails] = useState('#18-1-30/9, Opp. KGH OP Gate, Aditya Complex, Vishakapatnam-02\nPhone: 9059331954 / 08912751954\nEmail: info@smslabs.in / ops@dlabsfield.in\nWebsite: www.smslabs.in');
  const [clientName, setClientName] = useState('Apollo Corporate Health Services');
  const [clientDetails, setClientDetails] = useState('Plot No. 10, VIP Road, Visakhapatnam, Andhra Pradesh - 530003\nAttn: Accounts & Payroll Department\nPayment Term: Net 15 Days');
  const [taxPercent, setTaxPercent] = useState(18);

  // Itemized items
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: 'item-1', description: 'Consultant Pathologist Professional Services (July 2026)', quantity: 1, rate: 120000 },
    { id: 'item-2', description: 'On-site Medical Officer Charge - Contract Staffing', quantity: 10, rate: 3500 }
  ]);

  const [notif, setNotif] = useState('');

  // Handle row fields change
  const handleItemChange = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(prev =>
      prev.map(item => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  // Add empty row
  const handleAddItemRow = () => {
    const newItem: InvoiceItem = {
      id: `item-${Date.now()}`,
      description: '',
      quantity: 1,
      rate: 0
    };
    setItems([...items, newItem]);
  };

  // Remove row
  const handleRemoveItemRow = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  // Format currency helper
  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amt);
  };

  // Save/Generate Invoice
  const handleGenerateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter empty items
    const cleanedItems = items.filter(it => it.description.trim() !== '');
    if (cleanedItems.length === 0) {
      alert(t.invoiceEmptyItems || 'Please enter at least one item description.');
      return;
    }

    const newInvoice: Invoice = {
      id: `INV-${Date.now()}`,
      invoiceNumber,
      issueDate,
      dueDate,
      senderName,
      senderDetails,
      clientName,
      clientDetails,
      items: cleanedItems,
      taxPercent
    };

    onSaveInvoice(newInvoice);
    setActiveInvoiceId(newInvoice.id);
    setNotif(language === 'te' ? 'ఇన్‌వాయిస్ విజయవంతంగా సేవ్ చేయబడింది!' : 'Invoice saved and generated successfully!');
    setTimeout(() => setNotif(''), 3000);
  };

  // Get active invoice for preview
  const currentInvoiceForPreview: Invoice = activeInvoiceId === 'new' 
    ? {
        id: 'temp',
        invoiceNumber,
        issueDate,
        dueDate,
        senderName,
        senderDetails,
        clientName,
        clientDetails,
        items,
        taxPercent
      }
    : (invoices.find(inv => inv.id === activeInvoiceId) || invoices[0] || {
        id: 'temp',
        invoiceNumber,
        issueDate,
        dueDate,
        senderName,
        senderDetails,
        clientName,
        clientDetails,
        items,
        taxPercent
      });

  // Calculations for previewed invoice
  const previewSubtotal = currentInvoiceForPreview.items.reduce((acc, item) => acc + (item.quantity * item.rate), 0);
  const previewTax = Math.round(previewSubtotal * (currentInvoiceForPreview.taxPercent / 100));
  const previewTotal = previewSubtotal + previewTax;

  // Number to Words converter for Indian Rupees
  const convertNumberToWords = (num: number) => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    if (num === 0) return 'INR Zero Only';

    const n = ('000000000' + num).substr(-9);
    const crore = parseInt(n.substr(0, 2));
    const lakh = parseInt(n.substr(2, 2));
    const thousand = parseInt(n.substr(4, 2));
    const hundred = parseInt(n.substr(6, 1));
    const tens = parseInt(n.substr(7, 2));

    let str = '';
    if (crore > 0) {
      str += (crore < 20 ? a[crore] : b[Math.floor(crore/10)] + ' ' + a[crore%10]) + 'Crore ';
    }
    if (lakh > 0) {
      str += (lakh < 20 ? a[lakh] : b[Math.floor(lakh/10)] + ' ' + a[lakh%10]) + 'Lakh ';
    }
    if (thousand > 0) {
      str += (thousand < 20 ? a[thousand] : b[Math.floor(thousand/10)] + ' ' + a[thousand%10]) + 'Thousand ';
    }
    if (hundred > 0) {
      str += a[hundred] + 'Hundred ';
    }
    if (tens > 0) {
      if (tens < 20) str += a[tens];
      else str += b[Math.floor(tens/10)] + ' ' + a[tens%10];
    }
    return 'INR ' + str.trim() + ' Only';
  };

  return (
    <div id="invoice-module-container" className="space-y-6">
      
      {/* Selector and Actions Panel */}
      <div id="invoice-top-actions" className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-display text-slate-800">
              {t.invoiceTitle}
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              Create professional, company-branded billing invoices
            </p>
          </div>
        </div>

        {/* Invoice Toggler */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <select
            id="invoice-selector"
            value={activeInvoiceId}
            onChange={(e) => {
              const val = e.target.value;
              setActiveInvoiceId(val);
              if (val !== 'new') {
                const selected = invoices.find(inv => inv.id === val);
                if (selected) {
                  setInvoiceNumber(selected.invoiceNumber);
                  setIssueDate(selected.issueDate);
                  setDueDate(selected.dueDate);
                  setSenderName(selected.senderName);
                  setSenderDetails(selected.senderDetails);
                  setClientName(selected.clientName);
                  setClientDetails(selected.clientDetails);
                  setTaxPercent(selected.taxPercent);
                  setItems(selected.items);
                }
              } else {
                // Reset to new values
                setInvoiceNumber(`INV-2026-0${42 + invoices.length}`);
                setSenderName('SMS Diagnostics');
                setSenderDetails('#18-1-30/9, Opp. KGH OP Gate, Aditya Complex, Vishakapatnam-02\nPhone: 9059331954 / 08912751954\nEmail: info@smslabs.in / ops@dlabsfield.in\nWebsite: www.smslabs.in');
                setClientName('Apollo Corporate Health Services');
                setClientDetails('Plot No. 10, VIP Road, Visakhapatnam, Andhra Pradesh - 530003\nAttn: Accounts & Payroll Department\nPayment Term: Net 15 Days');
                setTaxPercent(18);
                setItems([
                  { id: 'item-1', description: 'Consultant Pathologist Professional Services (July 2026)', quantity: 1, rate: 120000 }
                ]);
              }
            }}
            className="border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 focus:outline-none transition-colors cursor-pointer"
          >
            <option value="new">+ {language === 'te' ? 'కొత్త బిల్లు సృష్టించు' : 'Create Fresh Invoice'}</option>
            {invoices.map(inv => (
              <option key={inv.id} value={inv.id}>
                {inv.invoiceNumber} — {inv.clientName.slice(0, 20)}
              </option>
            ))}
          </select>

          {/* Delete invoice button (only if not new and onDeleteInvoice provided) */}
          {activeInvoiceId !== 'new' && onDeleteInvoice && (
            <button
              onClick={() => {
                if (confirm(language === 'te' ? 'ఈ ఇన్‌వాయిస్‌ను ఖచ్చితంగా తొలగించాలనుకుంటున్నారా?' : 'Are you sure you want to delete this invoice?')) {
                  onDeleteInvoice(activeInvoiceId);
                  setActiveInvoiceId('new');
                }
              }}
              className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer border border-rose-100"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{language === 'te' ? 'తొలగించు' : 'Delete'}</span>
            </button>
          )}

          {/* Quick PDF print button */}
          <button
            id="print-invoice-btn"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-md shadow-teal-600/10"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{t.print}</span>
          </button>
        </div>
      </div>

      {notif && (
        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl border border-emerald-100 font-medium text-xs flex items-center gap-2.5 shadow-sm no-print">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          {notif}
        </div>
      )}

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: The Invoice Form (no-print) */}
        {activeInvoiceId === 'new' && (
          <div id="invoice-builder-form" className="xl:col-span-5 bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 space-y-5 no-print">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
              <FileText className="w-4 h-4 text-teal-600" />
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {language === 'te' ? 'బిల్లు వివరాలు రాయండి' : 'Invoice Specifications'}
              </h3>
            </div>

            <form onSubmit={handleGenerateInvoice} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    {t.invNumber}
                  </label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    required
                    className="w-full border border-slate-200 bg-slate-50/50 rounded-lg px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    {t.invTaxRate} (%)
                  </label>
                  <input
                    type="number"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(Number(e.target.value))}
                    required
                    min={0}
                    max={100}
                    className="w-full border border-slate-200 bg-slate-50/50 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    {t.invIssueDate}
                  </label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    required
                    className="w-full border border-slate-200 bg-slate-50/50 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    {t.invDueDate}
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                    className="w-full border border-slate-200 bg-slate-50/50 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  {t.invCompanyDetails}
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Company Name"
                  required
                  className="w-full border border-slate-200 bg-slate-50/50 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none mb-1.5 focus:ring-1 focus:ring-teal-500"
                />
                <textarea
                  value={senderDetails}
                  onChange={(e) => setSenderDetails(e.target.value)}
                  placeholder={t.invCompanyDetailsPlaceholder}
                  rows={2}
                  className="w-full border border-slate-200 bg-slate-50/50 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium text-slate-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  {t.invClientDetails}
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Client/Customer Name"
                  required
                  className="w-full border border-slate-200 bg-slate-50/50 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none mb-1.5 focus:ring-1 focus:ring-teal-500"
                />
                <textarea
                  value={clientDetails}
                  onChange={(e) => setClientDetails(e.target.value)}
                  placeholder={t.invClientDetailsPlaceholder}
                  rows={2}
                  className="w-full border border-slate-200 bg-slate-50/50 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium text-slate-600"
                />
              </div>

              {/* Dynamic Itemized Inputs */}
              <div className="space-y-2 pt-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {t.invItemizedTitle}
                </label>
                
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-2 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder={t.invItemDesc}
                          value={item.description}
                          onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                          required
                          className="w-full border-b border-transparent hover:border-slate-200 focus:border-teal-500 bg-transparent text-xs font-semibold focus:outline-none py-0.5"
                        />
                      </div>
                      
                      <div className="w-12">
                        <input
                          type="number"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(item.id, 'quantity', Number(e.target.value))}
                          required
                          min={1}
                          className="w-full text-center border-b border-transparent hover:border-slate-200 focus:border-teal-500 bg-transparent text-xs font-bold font-mono focus:outline-none"
                        />
                      </div>

                      <div className="w-18">
                        <input
                          type="number"
                          placeholder="Rate"
                          value={item.rate}
                          onChange={(e) => handleItemChange(item.id, 'rate', Number(e.target.value))}
                          required
                          min={0}
                          className="w-full text-right border-b border-transparent hover:border-slate-200 focus:border-teal-500 bg-transparent text-xs font-bold font-mono focus:outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(item.id)}
                        disabled={items.length === 1}
                        className="text-slate-400 hover:text-rose-500 disabled:opacity-30 p-1 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddItemRow}
                  className="w-full py-2 border-2 border-dashed border-slate-200 hover:border-teal-500 hover:bg-teal-50/20 text-slate-500 hover:text-teal-600 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t.btnAddItem || 'Add Item Row'}</span>
                </button>
              </div>

              {/* Action save */}
              <button
                type="submit"
                className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3 rounded-xl font-bold text-xs tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
              >
                <Save className="w-4 h-4 text-teal-400" />
                <span>{t.btnGenerateInvoice || 'Save & Generate Invoice'}</span>
              </button>
            </form>
          </div>
        )}

        {/* RIGHT COLUMN: Professional Real-World Preview */}
        <div 
          id="invoice-preview-card" 
          className={`bg-white rounded-[24px] p-8 sm:p-10 border border-slate-100 shadow-sm relative transition-all duration-300 print:border-0 print:shadow-none print:p-0 ${
            activeInvoiceId === 'new' ? 'xl:col-span-7' : 'xl:col-span-12'
          }`}
        >
          {/* Accent top line */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-teal-600 rounded-t-[24px] print:hidden" />

          {/* Letterhead Header Area */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-200 pb-6 gap-6">
            <div className="space-y-2">
              <div className="flex items-center">
                <SmsLogo textSize="text-2xl sm:text-3xl font-bold" subtitle={false} />
              </div>
              <p className="text-[10px] font-bold text-teal-600 tracking-wider uppercase">
                Diagnostic Laboratories & Clinical Services
              </p>
            </div>

            <div className="text-left sm:text-right text-[10px] text-slate-500 leading-relaxed space-y-0.5">
              <h4 className="font-extrabold text-slate-800 text-xs tracking-wide uppercase">SMS DIAGNOSTICS</h4>
              <p>#18-1-30/9, Opp. KGH OP Gate, Aditya Complex</p>
              <p>Visakhapatnam - 530002, Andhra Pradesh, India</p>
              <p className="font-bold text-slate-700">Phone: 9059331954 / 08912751954</p>
              <p>Email: info@smslabs.in / ops@dlabsfield.in</p>
              <p className="font-semibold text-teal-600">Web: www.smslabs.in</p>
            </div>
          </div>

          {/* Tax Invoice Heading */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-6 border-b border-slate-100 gap-2">
            <div>
              <span className="text-[10px] font-black tracking-widest text-teal-600 bg-teal-50 px-2.5 py-1 rounded-md uppercase">
                TAX INVOICE
              </span>
            </div>
            <div className="flex gap-4 text-[10px] text-slate-400">
              <div>
                <span className="font-bold uppercase tracking-wider block">Invoice No:</span>
                <span className="font-mono text-slate-800 font-extrabold text-sm text-teal-600">
                  {currentInvoiceForPreview.invoiceNumber}
                </span>
              </div>
              <div>
                <span className="font-bold uppercase tracking-wider block">Date of Issue:</span>
                <span className="font-mono text-slate-800 font-bold">
                  {currentInvoiceForPreview.issueDate}
                </span>
              </div>
              <div>
                <span className="font-bold uppercase tracking-wider block">Payment Terms:</span>
                <span className="text-slate-800 font-semibold">Net 15 Days</span>
              </div>
            </div>
          </div>

          {/* Bill-To Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 text-xs border-b border-slate-100">
            <div className="space-y-1">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Billed To:
              </span>
              <h3 className="font-extrabold text-slate-800 text-sm uppercase">
                {currentInvoiceForPreview.clientName}
              </h3>
              <div className="text-slate-500 text-[11px] leading-relaxed whitespace-pre-line font-medium">
                {currentInvoiceForPreview.clientDetails}
              </div>
            </div>

            <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-xl flex flex-col justify-between">
              <div className="space-y-1">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  Billed By / Pay To:
                </span>
                <h4 className="font-extrabold text-slate-800 uppercase text-xs">
                  {currentInvoiceForPreview.senderName}
                </h4>
                <p className="text-slate-500 text-[10px] leading-relaxed whitespace-pre-line">
                  {currentInvoiceForPreview.senderDetails}
                </p>
              </div>
              <div className="pt-2 text-[10px] text-slate-400 border-t border-slate-100 mt-2">
                Due Date: <span className="font-mono font-bold text-slate-700">{currentInvoiceForPreview.dueDate}</span>
              </div>
            </div>
          </div>

          {/* Line items table */}
          <div className="py-6">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-300 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                  <th className="py-2.5 w-12 text-center">Sr.</th>
                  <th className="py-2.5 pl-2">Description of Service / Contract Item</th>
                  <th className="py-2.5 text-center w-16">Qty</th>
                  <th className="py-2.5 text-right w-24">Rate (₹)</th>
                  <th className="py-2.5 text-right w-28">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {currentInvoiceForPreview.items.map((item, index) => (
                  <tr key={index} className="border-b border-slate-100 last:border-b-2 last:border-slate-800 text-slate-700 hover:bg-slate-50/30">
                    <td className="py-3 text-center font-mono text-slate-400 text-[11px]">
                      {(index + 1).toString().padStart(2, '0')}
                    </td>
                    <td className="py-3 pl-2 font-bold text-slate-800 uppercase text-[11px]">
                      {item.description || <span className="text-slate-300 italic">No description</span>}
                    </td>
                    <td className="py-3 text-center font-mono font-semibold text-slate-600 text-[11px]">
                      {item.quantity}
                    </td>
                    <td className="py-3 text-right font-mono font-semibold text-slate-600 text-[11px]">
                      {new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(item.rate)}
                    </td>
                    <td className="py-3 text-right font-mono font-extrabold text-slate-900 text-[11px]">
                      {new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(item.quantity * item.rate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals & Net Pay section */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 py-4 text-xs items-start">
            
            {/* Left side - Payable in words */}
            <div className="md:col-span-6 bg-teal-50/30 border border-teal-100/50 p-4 rounded-xl">
              <span className="text-[9px] text-teal-600 font-extrabold uppercase tracking-widest block mb-1">
                Total Amount in Words
              </span>
              <span className="font-black text-slate-700 block text-xs capitalize leading-snug">
                {convertNumberToWords(previewTotal)}
              </span>
            </div>

            {/* Right side - Calculations */}
            <div className="md:col-span-6 space-y-2 border-t border-slate-100 md:border-t-0 pt-4 md:pt-0">
              <div className="flex justify-between items-center text-slate-500 font-medium text-[11px]">
                <span>Subtotal:</span>
                <span className="font-mono font-bold text-slate-800">{formatCurrency(previewSubtotal)}</span>
              </div>
              
              {previewTax > 0 && (
                <div className="flex justify-between items-center text-slate-400 text-[11px]">
                  <span>GST Tax ({currentInvoiceForPreview.taxPercent}%):</span>
                  <span className="font-mono">{formatCurrency(previewTax)}</span>
                </div>
              )}
              
              <div className="flex justify-between items-center font-extrabold text-slate-800 border-t border-dashed border-slate-200 pt-2.5 text-xs">
                <span className="text-slate-900">Grand Total Payable:</span>
                <span className="font-mono text-teal-600 text-base">{formatCurrency(previewTotal)}</span>
              </div>

              <div className="flex justify-between items-center text-emerald-600 font-bold text-[11px]">
                <span>Total Paid to Date:</span>
                <span className="font-mono">{formatCurrency(previewTotal)}</span>
              </div>

              <div className="flex justify-between items-center text-slate-400 text-[10px] border-t border-slate-100 pt-1.5">
                <span>Due / Outstanding Balance:</span>
                <span className="font-mono font-bold">₹0</span>
              </div>
            </div>
          </div>

          {/* Footer terms and signature line */}
          <div className="mt-10 pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-end gap-6 text-[10px] text-slate-400 leading-relaxed">
            <div className="space-y-1 max-w-sm">
              <p className="font-black text-slate-500 uppercase tracking-widest text-[8px] mb-1">DECLARATION / NOTES</p>
              <p>
                * This is a computer generated digital Tax Invoice and does not require an physical signature or company stamp.
              </p>
              <p>
                GSTIN: UNREGISTERED / CLINIC SERVICE exemption.
              </p>
            </div>

            {/* Signature Area */}
            <div className="text-right shrink-0 min-w-[160px] pt-4">
              <div className="border-b border-slate-300 w-full mb-1.5" />
              <p className="font-black text-slate-700 text-[10px] tracking-wider uppercase">For SMS Diagnostics</p>
              <p className="text-[9px] text-slate-400 mt-0.5">Authorized Signatory</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

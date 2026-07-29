import { supabase } from '../supabase-client';

export interface PayrollConfig {
  [key: string]: number;
}

export const defaultPayrollConfig: PayrollConfig = {
  hra_fixed: 4800,
  medical_allowance: 2000,
  conveyance_allowance: 1500,
  pf_percent: 12,
  professional_tax: 200,
};

export async function fetchPayrollConfig(): Promise<PayrollConfig> {
  const { data, error } = await supabase
    .from('HRMS_payroll_config')
    .select('config_key, config_value');

  if (error) {
    console.warn("Failed to fetch payroll config, using defaults:", error);
    return { ...defaultPayrollConfig };
  }

  const config: PayrollConfig = { ...defaultPayrollConfig };
  if (data) {
    data.forEach((row) => {
      config[row.config_key] = row.config_value;
    });
  }

  return config;
}

export async function upsertPayrollConfig(key: string, value: number, label?: string): Promise<void> {
  const { error } = await supabase
    .from('HRMS_payroll_config')
    .upsert({
      config_key: key,
      config_value: value,
      label: label,
      updated_at: new Date().toISOString()
    }, { onConflict: 'config_key' });

  if (error) {
    throw error;
  }
}

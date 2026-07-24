import { useState, useCallback } from 'react';
import { Employee } from '../types';
import * as employeeService from '../lib/services/employee-service';
import { initialEmployees } from '../data';

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLocalMode, setIsLocalMode] = useState<boolean>(false);

  const saveLocalData = (emps: Employee[]) => {
    localStorage.setItem('hrms_local_employees', JSON.stringify(emps));
  };

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      try {
        await employeeService.seedInitialDatabase();
      } catch (seedErr) {
        console.warn('Seed database checked/passed or table not yet created:', seedErr);
      }

      const emps = await employeeService.fetchAllEmployeesData();
      setEmployees(emps);
      setIsLocalMode(false);
      saveLocalData(emps);
    } catch (err: any) {
      console.error('Error fetching Supabase data, falling back to local mode:', err);
      
      const savedEmps = localStorage.getItem('hrms_local_employees');
      let finalEmps: Employee[] = [];
      
      if (savedEmps) {
        try {
          finalEmps = JSON.parse(savedEmps);
        } catch {
          finalEmps = initialEmployees as unknown as Employee[];
        }
      } else {
        finalEmps = initialEmployees as unknown as Employee[];
      }
      
      setEmployees(finalEmps);
      setIsLocalMode(true);
      
      const errDetails = err?.message || err?.details || 'Database connection offline.';
      setError(`Notice: Running in Local/Offline Mode. Database sync issue: "${errDetails}". To connect to your Supabase instance, please execute the SQL schema in your Supabase project and define VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY in your settings.`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addEmployee = async (emp: Omit<Employee, 'isCheckedIn' | 'leaveBalance' | 'leaveRequests' | 'attendanceRecords' | 'checkInLogs' | 'payslips'>) => {
    if (isLocalMode) {
      const newEmp: Employee = {
        ...emp,
        role: emp.role || 'employee',
        status: emp.status || 'active',
        isCheckedIn: false,
        leaveBalance: {
          sick: { allowed: 6, taken: 0 },
          casual: { allowed: 8, taken: 0 }
        },
        leaveRequests: [],
        attendanceRecords: [],
        checkInLogs: [],
        payslips: []
      };
      const updated = [...employees, newEmp];
      setEmployees(updated);
      saveLocalData(updated);
      return;
    }
    await employeeService.createEmployee(emp);
    await loadData();
  };

  const updateEmployee = async (id: string, fields: Partial<Employee>) => {
    if (isLocalMode) {
      const updated = employees.map(e => e.id === id ? { ...e, ...fields } : e);
      setEmployees(updated);
      saveLocalData(updated);
      return;
    }
    await employeeService.updateEmployee(id, fields);
    await loadData();
  };

  const deleteEmployee = async (id: string) => {
    if (isLocalMode) {
      const updated = employees.filter(e => e.id !== id);
      setEmployees(updated);
      saveLocalData(updated);
      return;
    }
    await employeeService.deleteEmployee(id);
    await loadData();
  };

  const toggleStatus = async (id: string, status: 'active' | 'inactive') => {
    if (isLocalMode) {
      const updated = employees.map(e => e.id === id ? { ...e, status } : e);
      setEmployees(updated);
      saveLocalData(updated);
      return;
    }
    await employeeService.toggleEmployeeStatus(id, status);
    await loadData();
  };

  return {
    employees,
    isLoading,
    error,
    isLocalMode,
    loadData,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    toggleStatus
  };
}

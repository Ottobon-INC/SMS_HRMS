import { useState, useCallback } from 'react';
import { Employee } from '../types';
import * as employeeService from '../lib/services/employee-service';

function sanitizeEmployees(raw: any[]): Employee[] {
  return (raw || []).map((e: any) => ({
    ...e,
    payslips: e.payslips || [],
    leaveRequests: e.leaveRequests || [],
    attendanceRecords: e.attendanceRecords || [],
    checkInLogs: e.checkInLogs || [],
    locationPins: e.locationPins || [],
    advanceRequests: e.advanceRequests || []
  }));
}

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>(() => {
    try {
      const saved = localStorage.getItem('hrms_local_employees');
      return saved ? sanitizeEmployees(JSON.parse(saved)) : [];
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const saveLocalData = (emps: Employee[]) => {
    try {
      // Strip heavy fields before saving to localStorage to avoid QuotaExceededError
      const lightEmps = emps.map(emp => ({
        ...emp,
        checkInLogs: (emp.checkInLogs || []).slice(0, 10).map(log => ({
          ...log,
          photoUrl: undefined,
        })),
        attendanceRecords: (emp.attendanceRecords || []).slice(0, 30).map(att => ({
          ...att,
          photoUrl: undefined,
        })),
      }));
      localStorage.setItem('hrms_local_employees', JSON.stringify(lightEmps));
    } catch (storageErr) {
      console.warn('Could not cache employees to localStorage:', storageErr);
    }
  };

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      try {
        await employeeService.seedInitialDatabase();
      } catch (seedErr) {
        console.warn('Seed database checked/passed:', seedErr);
      }

      const emps = await employeeService.fetchAllEmployeesData();
      const sanitized = sanitizeEmployees(emps);
      setEmployees(sanitized);
      saveLocalData(sanitized);
    } catch (err: any) {
      console.error('Error fetching Supabase employee data:', err);
      const errDetails = err?.message || err?.details || 'Database connection offline.';
      setError(`Database connection notice: "${errDetails}". Ensure Supabase is configured and tables are migrated.`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addEmployee = async (emp: Omit<Employee, 'isCheckedIn' | 'leaveBalance' | 'leaveRequests' | 'attendanceRecords' | 'checkInLogs' | 'payslips'>) => {
    await employeeService.createEmployee(emp);
    await loadData();
  };

  const updateEmployee = async (id: string, fields: Partial<Employee>) => {
    await employeeService.updateEmployee(id, fields);
    await loadData();
  };

  const deleteEmployee = async (id: string) => {
    await employeeService.deleteEmployee(id);
    await loadData();
  };

  const toggleStatus = async (id: string, status: 'active' | 'inactive') => {
    await employeeService.toggleEmployeeStatus(id, status);
    await loadData();
  };

  return {
    employees,
    isLoading,
    error,
    loadData,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    toggleStatus
  };
}

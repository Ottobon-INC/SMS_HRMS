import * as advanceService from '../lib/services/advance-service';

export function useAdvances(isLocalMode: boolean, loadData: () => Promise<void>) {
  const submitAdvance = async (empId: string, amount: number, reason: string) => {
    if (isLocalMode) {
      alert("Advance requests require an online database connection.");
      return;
    }
    await advanceService.submitAdvanceRequest(empId, amount, reason);
    await loadData();
  };

  const approveAdvance = async (requestId: string) => {
    if (isLocalMode) {
      alert("Advance approvals require an online database connection.");
      return;
    }
    await advanceService.approveAdvance(requestId);
    await loadData();
  };

  const rejectAdvance = async (requestId: string) => {
    if (isLocalMode) {
      alert("Advance rejections require an online database connection.");
      return;
    }
    await advanceService.rejectAdvance(requestId);
    await loadData();
  };

  return {
    submitAdvance,
    approveAdvance,
    rejectAdvance
  };
}

import { supabase } from '../supabase-client';
import { DB_TABLES } from '../../core/database.tables';

export async function addProof(
  visitId: string,
  proofType: 'photo' | 'note' | 'signature' | 'otp' | 'document',
  content: string,
  latitude?: number,
  longitude?: number
): Promise<void> {
  const { error } = await supabase
    .from(DB_TABLES.FIELD_VISIT_PROOFS)
    .insert([{
      visit_id: visitId,
      proof_type: proofType,
      content,
      latitude,
      longitude
    }]);

  if (error) throw error;
}

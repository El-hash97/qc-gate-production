import { sql } from './db';
import { getProductionState } from './productionState';
import type { ProductionState } from './types';

export class InvalidResetPasswordError extends Error {
  constructor() {
    super('Invalid reset password');
    this.name = 'InvalidResetPasswordError';
  }
}

export class ResetPasswordNotConfiguredError extends Error {
  constructor() {
    super('RESET_PASSWORD is not set on the server');
    this.name = 'ResetPasswordNotConfiguredError';
  }
}

export function checkResetPassword(candidate: string): void {
  // Trim both sides: a trailing newline pasted into the Vercel env var (or a
  // stray space in the field) otherwise makes every attempt look "wrong".
  const expected = process.env.RESET_PASSWORD?.trim();
  if (!expected) {
    // Distinct from a wrong password so a missing env var doesn't masquerade
    // as "Password salah" forever.
    throw new ResetPasswordNotConfiguredError();
  }
  if (candidate.trim() !== expected) {
    throw new InvalidResetPasswordError();
  }
}

function hasAnyProduction(state: ProductionState): boolean {
  return (
    state.ok1 + state.repair1 + state.ng1 +
    state.ok2 + state.repair2 + state.ng2 +
    (state.ok3 ?? 0) + (state.repair3 ?? 0) + (state.ng3 ?? 0) +
    (state.ok4 ?? 0) + (state.repair4 ?? 0) + (state.ng4 ?? 0)
  ) > 0;
}

export async function resetProductionState(): Promise<ProductionState> {
  const current = await getProductionState();

  if (current && hasAnyProduction(current)) {
    // sql.transaction() batches these two statements into one atomic
    // round-trip — see https://neon.tech/docs/serverless/serverless-driver
    await sql.transaction([
      sql`
        INSERT INTO history
          (date, shift, operator, target, ok1, repair1, ng1, ok2, repair2, ng2,
           ok3, repair3, ng3, ok4, repair4, ng4,
           defect_data, repair_data, hourly_data,
           defect_data_shaft, repair_data_shaft, hourly_data_shaft,
           hourly_data_cam, hourly_data_crank,
           entry_logs, saved_at)
        VALUES (
          ${current.date}, ${current.shift}, ${current.operator}, ${current.target},
          ${current.ok1}, ${current.repair1}, ${current.ng1},
          ${current.ok2}, ${current.repair2}, ${current.ng2},
          ${current.ok3 ?? 0}, ${current.repair3 ?? 0}, ${current.ng3 ?? 0},
          ${current.ok4 ?? 0}, ${current.repair4 ?? 0}, ${current.ng4 ?? 0},
          ${JSON.stringify(current.defectData)}::jsonb,
          ${JSON.stringify(current.repairData)}::jsonb,
          ${JSON.stringify(current.hourlyData)}::jsonb,
          ${JSON.stringify(current.defectDataShaft ?? {})}::jsonb,
          ${JSON.stringify(current.repairDataShaft ?? {})}::jsonb,
          ${JSON.stringify(current.hourlyDataShaft ?? {})}::jsonb,
          ${JSON.stringify(current.hourlyDataCam ?? {})}::jsonb,
          ${JSON.stringify(current.hourlyDataCrank ?? {})}::jsonb,
          ${JSON.stringify(current.entryLogs)}::jsonb,
          now()
        )
      `,
      sql`
        UPDATE production_state SET
          date = '', shift = 'Shift Red', operator = '', target = 0,
          ok1 = 0, repair1 = 0, ng1 = 0, ok2 = 0, repair2 = 0, ng2 = 0,
          ok3 = 0, repair3 = 0, ng3 = 0, ok4 = 0, repair4 = 0, ng4 = 0,
          defect_data = '{}'::jsonb, repair_data = '{}'::jsonb, hourly_data = '{}'::jsonb,
          defect_data_shaft = '{}'::jsonb, repair_data_shaft = '{}'::jsonb, hourly_data_shaft = '{}'::jsonb,
          entry_logs = '[]'::jsonb,
          saved_at = now()
        WHERE id = 1
      `,
    ]);
  } else {
    await sql`
      UPDATE production_state SET
        date = '', shift = 'Shift Red', operator = '', target = 0,
        ok1 = 0, repair1 = 0, ng1 = 0, ok2 = 0, repair2 = 0, ng2 = 0,
        ok3 = 0, repair3 = 0, ng3 = 0, ok4 = 0, repair4 = 0, ng4 = 0,
        defect_data = '{}'::jsonb, repair_data = '{}'::jsonb, hourly_data = '{}'::jsonb,
        defect_data_shaft = '{}'::jsonb, repair_data_shaft = '{}'::jsonb, hourly_data_shaft = '{}'::jsonb,
        hourly_data_cam = '{}'::jsonb, hourly_data_crank = '{}'::jsonb,
        entry_logs = '[]'::jsonb,
        saved_at = now()
      WHERE id = 1
    `;
  }

  const fresh = await getProductionState();
  if (!fresh) {
    throw new Error('production_state row missing after reset');
  }
  return fresh;
}

import { sql } from './db';
import { getProductionState } from './productionState';
import type { ProductionState } from './types';

export class InvalidResetPasswordError extends Error {
  constructor() {
    super('Invalid reset password');
    this.name = 'InvalidResetPasswordError';
  }
}

export function checkResetPassword(candidate: string): void {
  const expected = process.env.RESET_PASSWORD;
  if (!expected || candidate !== expected) {
    throw new InvalidResetPasswordError();
  }
}

function hasAnyProduction(state: ProductionState): boolean {
  return (
    state.ok1 + state.repair1 + state.ng1 +
    state.ok2 + state.repair2 + state.ng2
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
           defect_data, repair_data, hourly_data, saved_at)
        VALUES (
          ${current.date}, ${current.shift}, ${current.operator}, ${current.target},
          ${current.ok1}, ${current.repair1}, ${current.ng1},
          ${current.ok2}, ${current.repair2}, ${current.ng2},
          ${JSON.stringify(current.defectData)}::jsonb,
          ${JSON.stringify(current.repairData)}::jsonb,
          ${JSON.stringify(current.hourlyData)}::jsonb,
          now()
        )
      `,
      sql`
        UPDATE production_state SET
          date = '', shift = 'Shift Red', operator = '', target = 0,
          ok1 = 0, repair1 = 0, ng1 = 0, ok2 = 0, repair2 = 0, ng2 = 0,
          defect_data = '{}'::jsonb, repair_data = '{}'::jsonb, hourly_data = '{}'::jsonb,
          saved_at = now()
        WHERE id = 1
      `,
    ]);
  } else {
    await sql`
      UPDATE production_state SET
        date = '', shift = 'Shift Red', operator = '', target = 0,
        ok1 = 0, repair1 = 0, ng1 = 0, ok2 = 0, repair2 = 0, ng2 = 0,
        defect_data = '{}'::jsonb, repair_data = '{}'::jsonb, hourly_data = '{}'::jsonb,
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

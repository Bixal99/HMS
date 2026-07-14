import { defineAbilitiesFor, type AppAbility } from "@shared/auth";

export type AbilityUser = {
  id: string;
  role: string;
  staffId?: string | null;
  patientId?: string | null;
  departmentId?: string | null;
};

export function getAbilityForUser(user: AbilityUser): AppAbility {
  return defineAbilitiesFor({
    id: user.id,
    role: user.role,
    staffId: user.staffId,
    patientId: user.patientId,
    departmentId: user.departmentId,
  });
}

// Reviewed, curated list — treat changes to this file with the same care as
// clinical-safety copy anywhere else in the app. Deliberately NOT stored in the
// database as admin-editable content.
export const RED_FLAG_SYMPTOMS = [
  {
    key: "chest_pain_radiating",
    label:
      "Chest pain or pressure, especially spreading to arm, jaw, or back",
  },
  {
    key: "difficulty_breathing",
    label: "Severe difficulty breathing or shortness of breath",
  },
  {
    key: "stroke_signs",
    label:
      "Sudden weakness or numbness on one side, facial drooping, or slurred speech",
  },
  {
    key: "severe_bleeding",
    label: "Severe or uncontrolled bleeding",
  },
  {
    key: "loss_of_consciousness",
    label: "Fainting or loss of consciousness",
  },
  {
    key: "severe_allergic_reaction",
    label: "Swelling of face/throat or severe allergic reaction",
  },
] as const;

export type RedFlagKey = (typeof RED_FLAG_SYMPTOMS)[number]["key"];

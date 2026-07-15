export function staffInviteEmail(input: {
  name: string;
  tempPassword: string;
  hospitalName?: string;
}) {
  const hospital = input.hospitalName || "MediCore";
  const subject = "Your MediCore account has been created";
  const text = [
    `Hello ${input.name},`,
    "",
    `An account has been created for you on ${hospital}.`,
    "",
    `Temporary password: ${input.tempPassword}`,
    "",
    "You'll be asked to set your own password on first login.",
    "Do not share this temporary password with anyone.",
    "",
    `— ${hospital}`,
  ].join("\n");

  return { subject, text };
}

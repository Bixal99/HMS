import { LandingPage } from "@/components/landing/LandingPage";

async function registrationEnabled() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/settings/public`,
      { cache: "no-store" },
    );
    if (!res.ok) return true;
    const body = (await res.json()) as {
      data?: { "features.patientSelfRegistration"?: boolean };
    };
    return body.data?.["features.patientSelfRegistration"] !== false;
  } catch {
    return true;
  }
}

export default async function HomePage() {
  const allowRegistration = await registrationEnabled();
  return <LandingPage allowRegistration={allowRegistration} />;
}

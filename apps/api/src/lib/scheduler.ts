import { expirePendingAppointments } from "../modules/appointments/appointments.service";
import { emitAppointmentEvent } from "./socket";

type Job = {
  name: string;
  intervalMs: number;
  run: () => Promise<void>;
};

const jobs: Job[] = [];
const timers = new Map<string, NodeJS.Timeout>();

export function registerJob(job: Job) {
  jobs.push(job);
}

export function startScheduler() {
  for (const job of jobs) {
    if (timers.has(job.name)) continue;
    const tick = async () => {
      try {
        await job.run();
      } catch (err) {
        console.error(`[scheduler] ${job.name} failed`, err);
      }
    };
    void tick();
    timers.set(job.name, setInterval(tick, job.intervalMs));
  }
}

export function stopScheduler() {
  for (const timer of timers.values()) clearInterval(timer);
  timers.clear();
}

/** Seed core jobs used by appointment lifecycle. */
export function registerAppointmentJobs() {
  registerJob({
    name: "expire-pending-appointments",
    intervalMs: 60_000,
    run: async () => {
      const expired = await expirePendingAppointments();
      for (const appt of expired) {
        emitAppointmentEvent("appointment:expired", appt);
      }
    },
  });
}

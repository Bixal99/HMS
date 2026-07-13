import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../generated/prisma/client";
import { getRequestContext } from "./requestContext";

const AUDITED_MODELS = new Set([
  "Patient",
  "Encounter",
  "Prescription",
  "Invoice",
  "Payment",
  "User",
  "Admission",
  "LabResult",
  "HospitalSetting",
]);

const AUDITED_OPERATIONS = new Set(["create", "update", "delete"]);

function toJsonSnapshot(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString });

const globalForPrisma = globalThis as unknown as {
  prismaBase?: PrismaClient;
};

export const prismaBase =
  globalForPrisma.prismaBase ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaBase = prismaBase;
}

export const prisma = prismaBase.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (
          !AUDITED_MODELS.has(model) ||
          !AUDITED_OPERATIONS.has(operation)
        ) {
          return query(args);
        }

        let before = null;

        if (operation === "update" || operation === "delete") {
          const delegateName =
            model.charAt(0).toLowerCase() + model.slice(1);
          const delegate = (prismaBase as any)[delegateName];

          before = await delegate
            .findUnique({ where: (args as any).where })
            .catch(() => null);
        }

        const result = await query(args);
        const context = getRequestContext();

        void prismaBase.auditLog
          .create({
            data: {
              userId: context.userId,
              action: operation.toUpperCase(),
              resourceType: model,
              resourceId:
                (result as any)?.id ?? (args as any).where?.id ?? null,
              beforeJson:
                before === null ? Prisma.DbNull : toJsonSnapshot(before),
              afterJson:
                operation === "delete"
                  ? Prisma.DbNull
                  : toJsonSnapshot(result),
              ipAddress: context.ipAddress,
              userAgent: context.userAgent,
            },
          })
          .catch((error) => console.error("Audit log write failed:", error));

        return result;
      },
    },
  },
}) as unknown as PrismaClient;

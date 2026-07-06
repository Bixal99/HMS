import prisma from "../../lib/prisma";

export class SettingsService {
  /**
   * Get all global settings
   */
  static async getSettings() {
    const settings = await prisma.hospitalSetting.findMany();
    // Convert array of {key, valueJson} to a single object map
    return settings.reduce((acc, curr) => {
      acc[curr.key] = curr.valueJson;
      return acc;
    }, {} as Record<string, any>);
  }

  /**
   * Batch update settings
   */
  static async updateSettings(updates: Record<string, any>, updatedByUserId: string) {
    const promises = Object.entries(updates).map(([key, value]) => {
      return prisma.hospitalSetting.upsert({
        where: { key },
        update: { valueJson: value, updatedBy: updatedByUserId },
        create: { key, valueJson: value, updatedBy: updatedByUserId }
      });
    });

    await prisma.$transaction(promises);
    return await this.getSettings();
  }
}

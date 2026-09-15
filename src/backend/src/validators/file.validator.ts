import { z } from "zod";

export const CASE_FILE_FOLDERS = ["INITIAL_OSINT", "LOCATION_ANALYSIS", "THREAT_ALERT"] as const;

export const uploadCaseFileSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    folder: z.enum(CASE_FILE_FOLDERS, {
      required_error: "folder is required",
      invalid_type_error: "folder must be INITIAL_OSINT, LOCATION_ANALYSIS, or THREAT_ALERT"
    })
  })
});

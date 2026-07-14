import fs from "fs";
import path from "path";
import multer from "multer";

const uploadsRoot = path.join(process.cwd(), "uploads", "radiology-reports");

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const itemId = String(req.params.itemId);
    const dir = path.join(uploadsRoot, itemId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  },
});

export const radiologyReportUpload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
});

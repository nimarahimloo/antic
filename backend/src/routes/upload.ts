import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAdmin } from "../middleware/auth.js";
import { sendError, HttpError } from "../lib/errors.js";

const uploadDir = process.env.UPLOAD_DIR || "./uploads";
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".bin";
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
});

const router = Router();
const publicBase = () => process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3001}`;

router.post("/", requireAdmin, upload.single("file"), (req, res) => {
  try {
    if (!req.file) throw new HttpError(400, "No file uploaded");
    const file_url = `${publicBase()}/uploads/${req.file.filename}`;
    res.json({ file_url });
  } catch (err) {
    sendError(res, err);
  }
});

export default router;

import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { optionalAuth, requireAdmin, type AuthedRequest } from "../middleware/auth.js";
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
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(jpeg|jpg|png|webp|gif)$/i.test(file.mimetype)) {
      cb(new Error("فقط تصویر مجاز است"));
      return;
    }
    cb(null, true);
  },
});

const router = Router();

function respondFile(req: AuthedRequest, res: import("express").Response) {
  if (!req.file) throw new HttpError(400, "No file uploaded");
  const file_url = `/uploads/${req.file.filename}`;
  res.json({ file_url });
}

/** Admin / catalog media */
router.post("/", requireAdmin, (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) return sendError(res, new HttpError(400, err.message || "Upload failed"));
    try {
      respondFile(req as AuthedRequest, res);
    } catch (e) {
      sendError(res, e);
    }
  });
});

/**
 * Public upload for virtual studio (window photo only).
 * Images only, size-capped. No auth required so customers can try studio.
 */
router.post("/public", optionalAuth, (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err) return sendError(res, new HttpError(400, err.message || "Upload failed"));
    try {
      respondFile(req as AuthedRequest, res);
    } catch (e) {
      sendError(res, e);
    }
  });
});

export default router;

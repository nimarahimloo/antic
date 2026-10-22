import { Router } from "express";
import { optionalAuth } from "../middleware/auth.js";
import { sendError } from "../lib/errors.js";

const router = Router();

router.post("/:name", optionalAuth, async (req, res) => {
  try {
    const name = req.params.name;
    console.info("[functions]", name, req.body);
    if (name === "generateInstallImage") {
      return res.json({ data: { install_image: "" } });
    }
    if (name === "generateRenderTemplate") {
      return res.json({ data: { image: "" } });
    }
    res.json({ data: null });
  } catch (err) {
    sendError(res, err);
  }
});

export default router;

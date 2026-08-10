import { Router } from "express";
import { createContactMessage } from "../controllers/contact.controller";

const router = Router();

router.post("/", createContactMessage);

export default router;
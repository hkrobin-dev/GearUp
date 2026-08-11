import { Router } from "express";
import { createContactMessage } from "../controllers/contact.controller";
import validate from "../middleware/validate";
import { createContactMessageSchema } from "../validations/contact.validation";

const router = Router();

router.post("/", validate(createContactMessageSchema), createContactMessage);

export default router;
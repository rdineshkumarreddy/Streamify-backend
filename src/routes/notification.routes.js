import { Router } from "express";
import {
    getNotifications,
    markAsRead,
    markAllAsRead
} from "../controllers/notification.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

router.use(verifyJWT);

router.route("/").get(getNotifications);
router.route("/mark-as-read/:notificationId").patch(markAsRead);
router.route("/mark-all-read").patch(markAllAsRead);

export default router;

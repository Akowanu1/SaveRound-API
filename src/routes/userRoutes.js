import express from 'express';
import { updateUserAvatar } from '../controllers/uploadController.js';
import protect from '../middlewares/authMiddleware.js';
import upload from '../middlewares/upload.js';

const router = express.Router();
router.put('/me/avatar', protect, upload, updateUserAvatar);
export default router;
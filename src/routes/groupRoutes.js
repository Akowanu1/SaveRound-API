import express from 'express';
import { uploadGroupImage } from '../controllers/uploadController.js';
import protect from '../middlewares/authMiddleware.js';
import upload from '../middlewares/upload.js';

const router = express.Router();
router.post('/:groupId/image', protect, upload, uploadGroupImage);
export default router;
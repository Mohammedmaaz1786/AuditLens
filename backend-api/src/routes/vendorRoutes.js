import express from 'express';
import { getVendors, getVendor, createVendor, updateVendor, deleteVendor, getVendorStats } from '../controllers/vendorController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/stats', protect, getVendorStats);
router.get('/', protect, getVendors);
router.get('/:id', protect, getVendor);
router.post('/', protect, authorize('admin', 'auditor'), createVendor);
router.put('/:id', protect, authorize('admin'), updateVendor);
router.delete('/:id', protect, authorize('admin'), deleteVendor);

export default router;
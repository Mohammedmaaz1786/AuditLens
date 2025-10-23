import express from 'express';
import {
  processInvoice,
  createInvoice,
  getInvoices,
  getInvoice,
  updateInvoice,
  deleteInvoice,
  approveInvoice,
  rejectInvoice,
  getInvoiceStats,
} from '../controllers/invoiceController.js';
import { protect, authorize } from '../middleware/auth.js';
import { upload, handleMulterError } from '../middleware/upload.js';

const router = express.Router();

router.get('/stats', protect, getInvoiceStats);
router.post('/process', protect, upload.single('file'), handleMulterError, processInvoice);
router.post('/', protect, createInvoice);
router.get('/', protect, getInvoices);
router.get('/:id', protect, getInvoice);
router.put('/:id', protect, authorize('admin', 'auditor'), updateInvoice);
router.delete('/:id', protect, authorize('admin'), deleteInvoice);
router.put('/:id/approve', protect, authorize('admin', 'auditor'), approveInvoice);
router.put('/:id/reject', protect, authorize('admin', 'auditor'), rejectInvoice);

export default router;
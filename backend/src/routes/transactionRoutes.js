import { Router } from 'express';
const router = Router();
import { deposit, withdraw } from '../controllers/transactionController';
import { verifyToken, authorizeRoles } from '../middleware/auth';

router.post('/deposit', verifyToken, authorizeRoles('AGENT', 'ADMIN'), deposit);
router.post('/withdraw', verifyToken, authorizeRoles('AGENT', 'ADMIN'), withdraw);

export default router;
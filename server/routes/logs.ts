import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/roles';

const router = Router();
const prisma = new PrismaClient();

// GET /api/logs/checks - all users can access
router.get('/checks', authenticateToken, async (_req, res) => {
  const logs = await prisma.checkLog.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ logs });
});

// GET /api/logs/api - admin only
router.get('/api', authenticateToken, requireAdmin, async (_req, res) => {
  const logs = await prisma.apiLog.findMany({
    include: { checkLog: { include: { user: { select: { name: true } } } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ logs });
});

// GET /api/logs/checks/:id/transactions - get API logs for a specific check
router.get('/checks/:id/transactions', authenticateToken, async (req: AuthRequest, res: Response) => {
  // Only admin can see API transaction details
  if (req.user!.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  const apiLogs = await prisma.apiLog.findMany({
    where: { checkLogId: String(req.params.id) },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ apiLogs });
});

export default router;

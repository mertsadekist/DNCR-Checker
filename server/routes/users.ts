import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/roles';

const router = Router();
const prisma = new PrismaClient();

// All routes require admin
router.use(authenticateToken, requireAdmin);

// GET /api/users
router.get('/', async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ users });
});

// POST /api/users
router.post('/', async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ message: 'Email already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword, role: role || 'EMPLOYEE' },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });
  res.status(201).json({ user });
});

// PUT /api/users/:id
router.put('/:id', async (req, res) => {
  const { name, email, role } = req.body;
  try {
    const user = await prisma.user.update({
      where: { id: String(req.params.id) },
      data: { ...(name && { name }), ...(email && { email }), ...(role && { role }) },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });
    res.json({ user });
  } catch {
    res.status(404).json({ message: 'User not found' });
  }
});

// POST /api/users/:id/reset-password
router.post('/:id/reset-password', async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword) {
    return res.status(400).json({ message: 'New password is required' });
  }
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: String(req.params.id) }, data: { password: hashedPassword } });
    res.json({ message: 'Password reset successfully' });
  } catch {
    res.status(404).json({ message: 'User not found' });
  }
});

// PATCH /api/users/:id/toggle-active
router.patch('/:id/toggle-active', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: String(req.params.id) } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.id === req.user!.id) {
      return res.status(400).json({ message: 'Cannot deactivate your own account' });
    }

    const updated = await prisma.user.update({
      where: { id: String(req.params.id) },
      data: { isActive: !user.isActive },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });
    res.json({ user: updated });
  } catch {
    res.status(404).json({ message: 'User not found' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  if (String(req.params.id) === req.user!.id) {
    return res.status(400).json({ message: 'Cannot delete your own account' });
  }
  try {
    await prisma.apiLog.deleteMany({ where: { checkLog: { userId: String(req.params.id) } } });
    await prisma.checkLog.deleteMany({ where: { userId: String(req.params.id) } });
    await prisma.user.delete({ where: { id: String(req.params.id) } });
    res.json({ message: 'User deleted successfully' });
  } catch {
    res.status(404).json({ message: 'User not found' });
  }
});

export default router;

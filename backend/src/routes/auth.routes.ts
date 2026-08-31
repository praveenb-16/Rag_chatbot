import { Router } from 'express';
import { signup, login, logout, me, sendSignupOTP } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.post('/send-otp', sendSignupOTP);   // Step 1: request OTP
router.post('/signup', signup);             // Step 2: verify OTP + create account
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', requireAuth, me);

export default router;

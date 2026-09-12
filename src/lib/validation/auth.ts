import { z } from 'zod';
import { email, password } from './common';

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
  redirectTo: z.string().startsWith('/').optional(),
});

export const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required').max(60),
    lastName: z.string().trim().max(60).optional().or(z.literal('')),
    email,
    password,
    confirmPassword: z.string(),
    marketingOptIn: z.coerce.boolean().default(false),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

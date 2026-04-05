'use client';

import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { login, loading, error } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#f8f8fa' }}>
      {/* Left panel — brand */}
      <div
        className="hidden lg:flex flex-col justify-between w-80 shrink-0 p-10"
        style={{ backgroundColor: '#2E2F32' }}
      >
        <div className="flex items-center gap-3">
          <Image src="/qashio.svg" alt="Qashio" width={28} height={34} className="invert" />
          <span className="text-white text-sm font-semibold tracking-wide">Mail Maker</span>
        </div>
        <p className="text-sm" style={{ color: '#7d7e8b' }}>
          Email template management &amp; rendering API — by Qashio.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <Image src="/qashio.svg" alt="Qashio" width={24} height={30} />
            <span className="text-base font-semibold" style={{ color: '#2e2f32' }}>
              Mail Maker
            </span>
          </div>

          <div className="mb-7">
            <h1 className="text-xl font-semibold" style={{ color: '#2e2f32' }}>
              Sign in
            </h1>
            <p className="mt-1 text-sm" style={{ color: '#636576' }}>
              Enter your credentials to continue
            </p>
          </div>

          {error && (
            <div
              className="mb-4 px-3 py-2 rounded-lg text-sm border"
              style={{ backgroundColor: '#ffeded', borderColor: '#ffc5c5', color: '#ee0000' }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit((d) => login(d.email, d.password))} className="space-y-4">
            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: '#2e2f32' }}
              >
                Email address
              </label>
              <input
                type="email"
                autoComplete="email"
                {...register('email')}
                className="w-full px-3 py-2.5 text-sm rounded-lg border outline-none transition-shadow"
                style={{ borderColor: '#E1E2E6', color: '#2e2f32' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#A7885A'; e.currentTarget.style.boxShadow = '0 0 0 3px #FAF7EF'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#E1E2E6'; e.currentTarget.style.boxShadow = 'none'; }}
              />
              {errors.email && (
                <p className="mt-1 text-xs" style={{ color: '#ee0000' }}>{errors.email.message}</p>
              )}
            </div>

            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: '#2e2f32' }}
              >
                Password
              </label>
              <input
                type="password"
                autoComplete="current-password"
                {...register('password')}
                className="w-full px-3 py-2.5 text-sm rounded-lg border outline-none transition-shadow"
                style={{ borderColor: '#E1E2E6', color: '#2e2f32' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#A7885A'; e.currentTarget.style.boxShadow = '0 0 0 3px #FAF7EF'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#E1E2E6'; e.currentTarget.style.boxShadow = 'none'; }}
              />
              {errors.password && (
                <p className="mt-1 text-xs" style={{ color: '#ee0000' }}>{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-sm font-semibold text-white rounded-lg transition-opacity disabled:opacity-50 mt-2"
              style={{ backgroundColor: '#A7885A' }}
              onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.backgroundColor = '#927b4e'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#A7885A'; }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

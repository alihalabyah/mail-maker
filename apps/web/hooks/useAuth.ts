"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { setToken, clearToken } from "@/lib/auth";
import type { AuthResponse } from "@/types";

export function useAuth() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.post<AuthResponse>("/auth/login", {
          email,
          password,
        });
        setToken(data.access_token);
        router.push("/templates");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Login failed");
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  const logout = useCallback(() => {
    clearToken();
    router.push("/login");
  }, [router]);

  return { login, logout, loading, error };
}

"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({ email: z.string().email(), password: z.string().min(6) });
type F = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<F>({ resolver: zodResolver(schema) });

  async function onSubmit(data: F) {
    setError("");
    const res = await signIn("credentials", { email: data.email, password: data.password, redirect: false });
    if (res?.error) setError("Invalid email or password");
    else { router.push("/dashboard"); router.refresh(); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />
      <div className="relative w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <TrendingUp className="h-6 w-6 text-emerald-400" />
            </div>
            <span className="text-2xl font-bold text-white">FinanceOS</span>
          </div>
          <p className="text-slate-400 text-sm">Your personal finance command center</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-5">
          <div>
            <h2 className="text-xl font-semibold text-white">Welcome back</h2>
            <p className="text-slate-400 text-sm mt-1">Sign in to your account</p>
          </div>
          {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Email</Label>
              <Input {...register("email")} type="email" placeholder="you@example.com" className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
              {errors.email && <p className="text-red-400 text-xs">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Password</Label>
              <Input {...register("password")} type="password" placeholder="••••••••" className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
              {errors.password && <p className="text-red-400 text-xs">{errors.password.message}</p>}
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white h-11 font-semibold">
              {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Signing in...</> : "Sign In"}
            </Button>
          </form>
          <p className="text-center text-sm text-slate-400">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-emerald-400 hover:text-emerald-300 font-medium">Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

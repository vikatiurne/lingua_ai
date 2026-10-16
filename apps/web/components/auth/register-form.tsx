"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Loader2, Mail, User } from "lucide-react";
import { registerSchema, type RegisterInput } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";

type FieldErrors = Partial<Record<keyof RegisterInput, string[]>>;

export function RegisterForm() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", name: "" },
  });

  async function onSubmit(data: RegisterInput) {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.status === 201) {
      router.push("/login?registered=1");
      return;
    }

    if (res.status === 409) {
      setError("email", { message: "Email вже зареєстровано" });
      return;
    }

    if (res.status === 429) {
      setError("root", {
        message: "Занадто багато спроб, спробуйте пізніше",
      });
      return;
    }

    if (res.status === 400) {
      const body = (await res.json()) as { errors?: FieldErrors };
      const fieldErrors = body.errors ?? {};
      (Object.keys(fieldErrors) as (keyof FieldErrors)[]).forEach((field) => {
        const messages = fieldErrors[field];
        if (messages?.length) {
          setError(field, { message: messages[0] });
        }
      });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="space-y-1.5">
        <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
          Створити акаунт
        </h1>
        <p className="text-sm text-muted-foreground">
          Безкоштовно — і за 5 хвилин матимете персональний план
        </p>
      </div>

      {errors.root && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2.5 text-sm font-medium text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errors.root.message}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Ім&apos;я</Label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="Олександр (опційно)"
            className="h-11 pl-9"
            aria-invalid={errors.name ? true : undefined}
            {...register("name")}
          />
        </div>
        {errors.name && (
          <p className="text-sm font-medium text-destructive">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="h-11 pl-9"
            aria-invalid={errors.email ? true : undefined}
            {...register("email")}
          />
        </div>
        {errors.email && (
          <p className="text-sm font-medium text-destructive">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Пароль</Label>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          placeholder="Мінімум 8 символів"
          aria-invalid={errors.password ? true : undefined}
          {...register("password")}
        />
        {errors.password && (
          <p className="text-sm font-medium text-destructive">
            {errors.password.message}
          </p>
        )}
      </div>

      <Button type="submit" className="h-11 w-full text-base" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="animate-spin" />
            Реєстрація...
          </>
        ) : (
          "Зареєструватися"
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Вже є акаунт?{" "}
        <Link
          href="/login"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Увійти
        </Link>
      </p>
    </form>
  );
}

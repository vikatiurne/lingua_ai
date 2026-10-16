"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerSchema, type RegisterInput } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <h2 className="text-xl font-semibold text-foreground">Реєстрація</h2>

      {errors.root && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errors.root.message}
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Ім&apos;я (опційно)</Label>
        <Input
          id="name"
          type="text"
          autoComplete="name"
          aria-invalid={errors.name ? true : undefined}
          {...register("name")}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={errors.email ? true : undefined}
          {...register("email")}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Пароль</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={errors.password ? true : undefined}
          {...register("password")}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Реєстрація..." : "Зареєструватися"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Вже є акаунт?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Увійти
        </Link>
      </p>
    </form>
  );
}

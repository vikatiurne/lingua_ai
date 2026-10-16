import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { registered?: string };
}) {
  return <LoginForm registered={searchParams.registered === "1"} />;
}

import { LoginForm } from "@/components/login-form";

export function LoginPage() {
  return (
    <div className="flex h-[100dvh] w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-3xl h-full flex items-center justify-center">
        <LoginForm />
      </div>
    </div>
  );
}

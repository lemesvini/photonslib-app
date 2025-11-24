import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDark, setIsDark] = useState(false);
  const navigate = useNavigate();

  const applyTheme = (shouldBeDark: boolean) => {
    setIsDark(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  // Theme detection logic
  useEffect(() => {
    const checkTheme = () => {
      const savedTheme = localStorage.getItem("theme");
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      const shouldBeDark = savedTheme ? savedTheme === "dark" : prefersDark;
      applyTheme(shouldBeDark);
    };

    checkTheme();

    // Listen for storage changes (theme changes from other components)
    window.addEventListener("storage", checkTheme);

    // Also check if the dark class is present on document element
    const observer = new MutationObserver(() => {
      const hasDarkClass = document.documentElement.classList.contains("dark");
      setIsDark(hasDarkClass);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      window.removeEventListener("storage", checkTheme);
      observer.disconnect();
    };
  }, []);

  // const handleToggleTheme = () => {
  //   applyTheme(!isDark);
  // };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await apiClient.login({ email, password });

      console.log("Login successful:", result);

      // Navigate to the homepage on successful login
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Login error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "An error occurred during login"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "relative flex flex-col gap-6 rounded-[40px] p-6 md:p-10",
        "bg-background text-foreground",
        className
      )}
      style={{
        boxShadow: isDark
          ? "inset 0px 20px 40px #1a202c, inset -20px -20px 40px #3f4d61"
          : "inset 4px 4px 10px #b8bec9, inset -4px -4px 10px #ffffff",
        backgroundBlendMode: "soft-light",
      }}
      {...props}
    >
      <div className="pointer-events-none absolute inset-0 rounded-[40px] opacity-30" />
      <div className="relative z-10 flex flex-col gap-6">
        <div className="grid gap-6 md:grid-cols-2">
          <section
            className={cn("neu-card flex flex-col gap-4 rounded-[30px] p-6")}
          >
            <div className="space-y-2">
              <div className="w-full justify-center items-center flex">
                <img src="/bflogo.png" alt="logo" className="w-fit mb-10" />
              </div>
              <p className="text-sm uppercase tracking-[0.5em] text-muted-foreground">
                Bem Vindo
              </p>
              {/* <h2 className="text-2xl font-semibold">-</h2> */}
              <div
                className="h-1 w-8 rounded-full my-4"
                style={{
                  background: isDark ? "#8b9dc3" : "#a5b4d4",
                  boxShadow: "var(--shadow-neu-subtle)",
                }}
              />
              <p className="text-sm text-muted-foreground">
                Biblioteca de Fótons é um projeto de centralização e catalogação
                de registros pessoais do criador.
              </p>
            </div>
            <div className="mt-auto text-[9px] text-muted-foreground">
              © {new Date().getFullYear()} Biblioteca de Fótons. Todos os
              direitos reservados.
            </div>
          </section>

          <form
            className={cn(
              "neu-card rounded-[30px] p-6 shadow-[var(--shadow-neu-pressed)]"
            )}
            onSubmit={handleSubmit}
          >
            <div className="flex flex-col gap-4">
              <div className="flex w-full flex-col items-center justify-center gap-3">
                {/* <img
                  src={
                    isDark
                      ? "/async-text-logo-white.svg"
                      : "/async-text-logo-dark.svg"
                  }
                  alt="Async Logo"
                  className="w-48"
                /> */}
                <p className="text-sm text-muted-foreground">
                  Se você tem uma conta, entre com suas credenciais abaixo:
                </p>
              </div>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50/80 p-3 text-center text-sm text-red-600 shadow-[var(--shadow-neu-flat)]">
                  {error}
                </div>
              )}

              <label className="text-sm font-medium" htmlFor="email">
                Email
              </label>
              <div className={cn("neu-input rounded-2xl px-4 py-3")}>
                <input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
                />
              </div>

              <div className="flex items-center text-sm font-medium">
                <label htmlFor="password">Senha</label>
                {/* <a
                  href="#"
                  className="ml-auto text-xs text-muted-foreground underline-offset-2 hover:underline"
                  onClick={(e) => e.preventDefault()}
                >
                  Forgot?
                </a> */}
              </div>
              <div className="neu-input rounded-2xl px-4 py-3">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
                />
              </div>

              <button
                type="submit"
                className="neu-button mt-2 rounded-2xl bg-transparent px-4 py-3 text-sm font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Login"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

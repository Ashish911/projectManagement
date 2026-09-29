import React, { SyntheticEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "react-query";
import { cn } from "@/components/lib/utils.ts";
import { buttonVariants } from "@/components/ui/button.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Icons } from "@/components/ui/icons.tsx";
import { resetPassword } from "@/api/authApi.ts";

export const ResetPassword: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [token, setToken] = useState<string>(location.state?.token ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { mutateAsync, isLoading } = useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      resetPassword(token, password),
  });

  const passwordsMatch = password === confirmPassword || confirmPassword === "";

  async function onSubmit(e: SyntheticEvent) {
    e.preventDefault();
    if (!passwordsMatch || !password || !confirmPassword) return;
    setError(null);
    try {
      await mutateAsync({ token, password });
      setSuccess(true);
      setTimeout(() => navigate("/"), 2000);
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="container relative hidden h-[800px] flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <Link
        to={"/"}
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "absolute right-4 top-4 md:right-8 md:top-8"
        )}
      >
        Back to Login
      </Link>
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
        <div className="absolute inset-0 bg-zinc-900" />
        <div className="relative z-20 flex items-center text-lg font-medium">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2 h-6 w-6"
          >
            <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
          </svg>
          Acme Inc
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">
              &ldquo;Enter your reset token and choose a new password.&rdquo;
            </p>
          </blockquote>
        </div>
      </div>
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Reset Password</h1>
            <p className="text-sm text-muted-foreground">
              Enter your reset token and new password
            </p>
          </div>

          {success ? (
            <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200 text-center">
              Password reset successfully! Redirecting to login...
            </div>
          ) : (
            <form onSubmit={onSubmit} className="grid gap-3">
              <div className="grid gap-1">
                <Label className="sr-only" htmlFor="token">Reset Token</Label>
                <Input
                  id="token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Reset Token"
                  type="text"
                  disabled={isLoading}
                  required
                />
              </div>
              <div className="grid gap-1">
                <Label className="sr-only" htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New Password"
                  type="password"
                  disabled={isLoading}
                  className={cn(!passwordsMatch && confirmPassword ? "border-red-500 focus-visible:ring-red-500" : "")}
                  required
                />
              </div>
              <div className="grid gap-1">
                <Label className="sr-only" htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm New Password"
                  type="password"
                  disabled={isLoading}
                  className={cn(!passwordsMatch && confirmPassword ? "border-red-500 focus-visible:ring-red-500" : "")}
                  required
                />
                {!passwordsMatch && confirmPassword && (
                  <p className="text-sm text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>
              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}
              <Button disabled={isLoading || !passwordsMatch || !password || !confirmPassword || !token}>
                {isLoading && <Icons.niceSpinner className="mr-2 h-4 w-4 animate-spin" />}
                Reset Password
              </Button>
            </form>
          )}

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have a token?{" "}
            <Link to="/forgot-password" className="underline underline-offset-4 hover:text-primary">
              Request one here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

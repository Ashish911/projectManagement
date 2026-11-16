import React, { SyntheticEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "react-query";
import { cn } from "@/components/lib/utils.ts";
import { buttonVariants } from "@/components/ui/button.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Icons } from "@/components/ui/icons.tsx";
import { forgotPassword } from "@/api/authApi.ts";

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  // Set once the request succeeds; the reset link itself is sent by email.
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { mutateAsync, isLoading } = useMutation({ mutationFn: forgotPassword });

  async function onSubmit(e: SyntheticEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await mutateAsync(email);
      setSentMessage(res.forgotPassword.message);
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
              &ldquo;Enter your email and we&apos;ll send you a link to reset your password.&rdquo;
            </p>
          </blockquote>
        </div>
      </div>
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Forgot Password</h1>
            <p className="text-sm text-muted-foreground">
              Enter your email to receive a reset link
            </p>
          </div>

          {sentMessage ? (
            <div className="grid gap-4">
              <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
                <p className="font-medium mb-2">Check your email</p>
                <p>{sentMessage}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  The link expires in 1 hour.
                </p>
              </div>
              <Link to="/" className={cn(buttonVariants({ variant: "outline" }))}>
                Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="grid gap-4">
              <div className="grid gap-1">
                <Label className="sr-only" htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email Address"
                  type="email"
                  autoCapitalize="none"
                  disabled={isLoading}
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}
              <Button disabled={isLoading || !email}>
                {isLoading && <Icons.niceSpinner className="mr-2 h-4 w-4 animate-spin" />}
                Send Reset Link
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

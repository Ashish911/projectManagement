import React, { SyntheticEvent, useState } from "react";

import { cn } from "@/lib/utils";
import { Icons } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { useLogin } from "../../actions/auth";
import { QueryClient, useMutation, useQuery } from "react-query";
import { loginUser } from "@/api/authApi";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {}

const buttonMap = [
  {
    name: "Github",
    icon: <Icons.gitHub className="mr-2 h-4 w-4" />,
  },
  {
    name: "Google",
    icon: <Icons.google className="mr-2 h-4 w-4" />,
  },
  {
    name: "Apple",
    icon: <Icons.apple className="mr-2 h-4 w-4" />,
  },
  {
    name: "Twitter",
    icon: <Icons.twitter className="mr-2 h-4 w-4" />,
  },
];

export function UserAuthRegisterForm({
  className,
  ...props
}: UserAuthFormProps) {
  return <div>asd</div>;
}

export function UserAuthLoginForm({ className, ...props }: UserAuthFormProps) {
  const [isLoading, setIsLoading] = useState<Boolean>(false);
  const [email, setEmail] = useState<String>("");
  const [password, setPassword] = useState<String>("");
  const queryClient = new QueryClient();

  const { mutateAsync: loginUserMutation } = useMutation({
    mutationFn: loginUser,
  });

  async function onSubmit(event: SyntheticEvent) {
    event.preventDefault();
    setIsLoading(true);
    try {
      await loginUserMutation({ email: email, password: password });
    } catch (e) {
      console.log(e);
    }
  }

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      {/* {isError && <div>{error?.message}</div>} */}
      <form onSubmit={onSubmit}>
        <div className="grid gap-2">
          <div className="grid gap-1">
            <div>
              <Label className="sr-only" htmlFor="Email">
                Email Address
              </Label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                id="Email"
                placeholder="Email Address"
                type="email"
                autoCapitalize="none"
                disabled={isLoading}
              />
            </div>
            <div>
              <Label className="sr-only" htmlFor="Password">
                Password
              </Label>
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                id="Password"
                placeholder="Password"
                type="password"
                autoCapitalize="none"
                disabled={isLoading}
              />
            </div>
          </div>

          <Button disabled={isLoading}>
            {isLoading && (
              <Icons.niceSpinner className="mr-2 h-4 w-4 animate-spin" />
            )}
            Login
          </Button>
        </div>
      </form>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or login with
          </span>
        </div>
      </div>
      <div>
        {buttonMap.map(({ name, icon }, index) => {
          return (
            <Button
              key={name + index}
              variant="outline"
              type="button"
              disabled={isLoading}
            >
              {isLoading ? (
                <Icons.niceSpinner className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                icon
              )}{" "}
              {name}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

import React, { SyntheticEvent, useState } from "react";

import { cn } from "@/lib/utils";
import { Icons } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { useInputMap } from "@/hooks/useInputMap";
import { useInputFields } from "@/hooks/useInputFields";
import { useLogin } from "../../actions/auth";
import { QueryClient, useMutation, useQuery } from "react-query";
import { loginUser } from "@/api/authApi";

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
  const [isLoading, setIsLoading] = useState<Boolean>(false);
  //   const [email, setEmail] = useState<String>("");
  //   const [name, setName] = useState<String>("");
  //   const [password, setPassword] = useState<String>("");
  //   const [confirmPassword, setConfirmPassword] = useState<String>("");
  //   const [phoneNumber, setPhoneNumber] = useState<String>("");
  //   const [gender, setGender] = useState<String>("");
  //   const [dob, setDob] = useState<String>("");

  async function onSubmit(event: SyntheticEvent) {
    event.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
    }, 3000);
  }

  const requiredInputs = [
    "email",
    "phoneNumber",
    "name",
    "password",
    "confirmPassword",
    "gender",
    "dateOfBirth",
  ];

  const inputMap = useInputMap(requiredInputs);

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <form onSubmit={onSubmit}>
        <div className="grid gap-2">
          {useInputFields(inputMap, isLoading)}
          <Button disabled={isLoading}>
            {isLoading && (
              <Icons.niceSpinner className="mr-2 h-4 w-4 animate-spin" />
              // <Spinner />
            )}
            Sign In with Email
          </Button>
        </div>
      </form>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
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

export function UserAuthLoginForm({ className, ...props }: UserAuthFormProps) {
  //   const [isLoading, setIsLoading] = useState<Boolean>(false);
  //   const [email, setEmail] = useState<String>("");
  //   const [password, setPassword] = useState<String>("");
  const queryClient = new QueryClient();

  const requiredInputs = ["email", "password"];

  const inputMap = useInputMap(requiredInputs);

  //   const { data, isLoading } = useQuery({
  //     queryFn: () => fetchUser(),
  //     queryKey: ["users", { search }],
  //   staleTime: Infinity,
  // cacheTime: 0,
  //   })

  const { mutateAsync: loginUserMutation } = useMutation({
    mutationFn: loginUser,
    // onSuccess: () => {
    //     queryClient.invalidateQueries(["users"])
    // }
  });

  //   const { mutate, isLoading, isError, error } = useLogin();

  async function onSubmit(event: SyntheticEvent) {
    event.preventDefault();
    // setIsLoading(true);

    // setTimeout(() => {
    //   setIsLoading(false);
    // }, 3000);
    // mutate({ inputMap.email, inputMap.password });

    try {
      await loginUserMutation(inputMap);
    } catch (e) {
      console.log(e);
    }
  }

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      {/* {isError && <div>{error?.message}</div>} */}
      <form onSubmit={onSubmit}>
        <div className="grid gap-2">
          {useInputFields(inputMap, isLoading)}
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

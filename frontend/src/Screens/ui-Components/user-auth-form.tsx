import React, {SyntheticEvent, useEffect, useState} from "react";

import { cn } from "@/components/lib/utils";
import { Icons } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDispatch, useSelector } from 'react-redux';
import {Navigate, useNavigate} from 'react-router-dom';
import {useMutation} from "react-query";
import {loginUser, registerUser} from "@/api/authApi.ts";
import {
  LOGIN_FAIL,
  LOGIN_REQUEST,
  LOGIN_SUCCESS,
  REGISTER_REQUEST,
  REGISTER_SUCCESS,
  REGISTER_FAIL,
  REGISTER_RESET
} from "@/redux/constants/authConstants.ts";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover.tsx";
import { ChevronDownIcon } from "lucide-react"
import {Calendar} from "@/components/ui/calendar.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {format} from "date-fns";

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
  }
];

export function UserAuthRegisterForm({
  className,
  ...props
}: UserAuthFormProps) {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [gender, setGender] = useState<string>("M");
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(undefined);
  const [open, setOpen] = useState(false)

  const navigate = useNavigate();

  const authInfo = useSelector((state) => state.register)
  const { loading, success } = authInfo;

  const passwordsMatch = password === confirmPassword || confirmPassword === ""

  const dispatch = useDispatch();

  const { mutateAsync: registerUserMutation } = useMutation({
    mutationFn: registerUser,
  });

  async function onSubmit(event: SyntheticEvent) {
    event.preventDefault();
    try {
      dispatch({
        type: REGISTER_REQUEST
      })

      const response = await registerUserMutation({
        email: email,
        name: name,
        number: phoneNumber,
        gender: gender,
        dob: format(dateOfBirth, 'yyyy/MM/dd'),
        password: password,
      });

      dispatch({
        type: REGISTER_SUCCESS,
        payload: response.data.register
      });



    } catch (error) {
      dispatch({
        type: REGISTER_FAIL,
        payload:
            error.response && error.response.data.message
                ? error.response.data.message
                : error.message
      })
      console.log(error);
    }
  }

  useEffect(() => {
      if (success){
        dispatch({ type: REGISTER_RESET });
        navigate("/", { replace: true })
      }
  }, [success])

  return (
      <div className={cn("grid gap-6", className)} {...props}>
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
                    disabled={loading}
                />
              </div>
              <div>
                <Label className="sr-only" htmlFor="Email">
                  Full Name
                </Label>
                <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    id="FullName"
                    placeholder="Full Name"
                    type="text"
                    autoCapitalize="none"
                    disabled={loading}
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
                    disabled={loading}
                    className={cn(
                        !passwordsMatch && confirmPassword ? "border-red-500 focus-visible:ring-red-500" : ""
                    )}
                />
              </div>
              <div>
                <Label className="sr-only" htmlFor="Password">
                  Confirm Password
                </Label>
                <Input
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    id="ConfirmPassword"
                    placeholder="Confirm Password"
                    type="password"
                    autoCapitalize="none"
                    disabled={loading}
                    className={cn(
                        !passwordsMatch && confirmPassword ? "border-red-500 focus-visible:ring-red-500" : ""
                    )}
                />
                {!passwordsMatch && confirmPassword && (
                    <p className="text-sm text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>
              <div>
                <Label className="sr-only" htmlFor="Password">
                  Phone Number
                </Label>
                <Input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    id="PhoneNumber"
                    placeholder="Phone Number"
                    type="text"
                    autoCapitalize="none"
                    disabled={loading}
                />
              </div>
              <div>
                <Select onValueChange={(e) => setGender(e)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a gender" value={gender} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">
                      <span className="font-medium">Male</span>
                    </SelectItem>
                    <SelectItem value="F">
                      <span className="font-medium">Female</span>
                    </SelectItem>
                    <SelectItem value="O">
                      <span className="font-medium">Others</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                      variant="outline"
                      id="date"
                      className="w-48 justify-between font-normal"
                  >
                    {dateOfBirth ? dateOfBirth.toLocaleDateString() : "Select date"}
                    <ChevronDownIcon />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                  <Calendar
                      className="rounded-md border shadow-sm"
                      captionLayout="dropdown"
                      mode="single"
                      selected={dateOfBirth}
                      onSelect={(date) => {
                        setDateOfBirth(date)
                        setOpen(false)
                      }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button disabled={!passwordsMatch || !password || !confirmPassword || loading}>
              {loading && (
                  <Icons.niceSpinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              Register
            </Button>
          </div>
        </form>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or Register with
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
                    disabled={loading}
                >
                  {loading ? (
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
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const authInfo = useSelector((state) => state.login)
  const { loading, token } = authInfo;

  const dispatch = useDispatch();

  const { mutateAsync: loginUserMutation } = useMutation({
    mutationFn: loginUser,
  });

  async function onSubmit(event: SyntheticEvent) {
    event.preventDefault();
    try {
      dispatch({
        type: LOGIN_REQUEST
      })

      const response = await loginUserMutation({
        email: email,
        password: password,
      });

      dispatch({
        type: LOGIN_SUCCESS,
        payload: response.login.token
      });
      localStorage.setItem('token', response.login.token)

    } catch (error) {
      dispatch({
        type: LOGIN_FAIL,
        payload:
            error.response && error.response.data.message
                ? error.response.data.message
                : error.message
      })
    }
  }

  if (token != null) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className={cn("grid gap-6", className)} {...props}>
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
                disabled={loading}
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
                disabled={loading}
              />
            </div>
          </div>

          <Button disabled={loading}>
            {loading && (
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
              disabled={loading}
            >
              {loading ? (
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

import React, { SyntheticEvent, useEffect, useState } from 'react'

import { cn } from "@/lib/utils"
import { Icons } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {}

export function UserAuthRegisterForm({ className, ...props }: UserAuthFormProps) {

    const [isLoading, setIsLoading] = useState<Boolean>(false)
    const [email, setEmail] = useState<String>('')
    const [name, setName] = useState<String>('')
    const [password, setPassword] = useState<String>('')
    const [confirmPassword, setConfirmPassword] = useState<String>('')
    const [phoneNumber, setPhoneNumber] = useState<String>('')
    const [gender, setGender] = useState<String>('')
    const [dob, setDob] = useState<String>('')

    async function onSubmit(event: SyntheticEvent) {
        event.preventDefault()
        setIsLoading(true)

        setTimeout(() => {
            setIsLoading(false)
        }, 3000)
    }

    const inputMap = [{
        type: 'email',
        name: 'email',
        placeholder: 'name@example.com',
        value: email,
        onChange: setEmail
    }, {
        type: 'text',
        name: 'name',
        placeholder: 'John Doe',
        value: name,
        onChange: setName
    }, {
        type: 'string',
        name: 'phoneNumber',
        placeholder: '+977 ......',
        value: phoneNumber,
        onChange: setPhoneNumber
    }, {
        type: 'password',
        name: 'password',
        placeholder: 'Password',
        value: password,
        onChange: setPassword
    }, {
        type: 'password',
        name: 'confirmPassword',
        placeholder: 'Confirm Password',
        value: confirmPassword,
        onChange: setConfirmPassword
    }, {
        type: 'select',
        name: 'gender',
        value: gender,
        onChange: setGender
    }, {
        type: 'date',
        name: 'dateOfBirth',
        value: dob,
        onChange: setDob
    }]

    return (
        <div className={cn("grid gap-6", className)} {...props}>
            <form onSubmit={onSubmit}>
                <div className="grid gap-2">
                    <div className="grid gap-1">
                        {inputMap.map((input, index) => {
                            return <div key={index}>
                                <Label className="sr-only" htmlFor={input.name}>
                                    {input.name}
                                </Label>
                                {input.type == 'select' ? 
                                    <Select  onValueChange={input.onChange}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a gender" value={input.value} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="male">
                                                <span className="font-medium">Male</span>
                                            </SelectItem>
                                            <SelectItem value="female">
                                                <span className="font-medium">Female</span>
                                            </SelectItem>
                                            <SelectItem value="others">
                                                <span className="font-medium">Others</span>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                : input.type == 'date' ?
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !input.value && "text-muted-foreground"
                                            )}
                                            >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {input.value ? format(dob, "PPP") : <span>Pick a date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar
                                            mode="single"
                                            selected={input.value}
                                            onSelect={input.onChange}
                                            initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                :
                                    <Input
                                        value={input.value}
                                        onChange={(e) => input.onChange(e.target.value)}
                                        id={input.name}
                                        placeholder={input.placeholder}
                                        type={input.type}
                                        autoCapitalize="none"
                                        autoComplete={input.name}
                                        autoCorrect="off"
                                        disabled={isLoading}
                                    />
                                }
                            </div> 
                        })}
                    </div>
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
                <Button variant="outline" type="button" disabled={isLoading}>
                    {isLoading ? (
                    <Icons.niceSpinner className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                    <Icons.gitHub className="mr-2 h-4 w-4" />
                    )}{" "}
                    Github
                </Button>
                <Button variant="outline" type="button" disabled={isLoading}>
                    {isLoading ? (
                    <Icons.niceSpinner className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                    <Icons.google className="mr-2 h-4 w-4" />
                    )}{" "}
                    Google
                </Button>
                <Button variant="outline" type="button" disabled={isLoading}>
                    {isLoading ? (
                    <Icons.niceSpinner className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                    <Icons.apple className="mr-2 h-4 w-4" />
                    )}{" "}
                    Apple
                </Button>
                <Button variant="outline" type="button" disabled={isLoading}>
                    {isLoading ? (
                    <Icons.niceSpinner className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                    <Icons.twitter className="mr-2 h-4 w-4" />
                    )}{" "}
                    Twitter
                </Button>
            </div>
        </div>
    )
}

export function UserAuthLoginForm({ className, ...props}: UserAuthFormProps) {
    const [isLoading, setIsLoading] = useState<Boolean>(false)

    async function onSubmit(event: SyntheticEvent) {
        event.preventDefault()
        setIsLoading(true)

        setTimeout(() => {
            setIsLoading(false)
        }, 3000)
    }

    return (
        <div className={cn("grid gap-6", className)} {...props}>
            <form onSubmit={onSubmit}>
                <div className="grid gap-2">
                    <div className="grid gap-1">
                        <Label className="sr-only" htmlFor="email">
                        Email
                        </Label>
                        <Input
                        id="email"
                        placeholder="name@example.com"
                        type="email"
                        autoCapitalize="none"
                        autoComplete="email"
                        autoCorrect="off"
                        disabled={isLoading}
                        />
                    </div>
                    <div className="grid gap-1">
                        <Label className="sr-only" htmlFor="password">
                        Password
                        </Label>
                        <Input
                        id="password"
                        placeholder="password"
                        type="password"
                        autoCapitalize="none"
                        autoComplete="password"
                        autoCorrect="off"
                        disabled={isLoading}
                        />
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
                <Button variant="outline" type="button" disabled={isLoading}>
                    {isLoading ? (
                    <Icons.niceSpinner className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                    <Icons.gitHub className="mr-2 h-4 w-4" />
                    )}{" "}
                    Github
                </Button>
                <Button variant="outline" type="button" disabled={isLoading}>
                    {isLoading ? (
                    <Icons.niceSpinner className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                    <Icons.google className="mr-2 h-4 w-4" />
                    )}{" "}
                    Google
                </Button>
                <Button variant="outline" type="button" disabled={isLoading}>
                    {isLoading ? (
                    <Icons.niceSpinner className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                    <Icons.apple className="mr-2 h-4 w-4" />
                    )}{" "}
                    Apple
                </Button>
                <Button variant="outline" type="button" disabled={isLoading}>
                    {isLoading ? (
                    <Icons.niceSpinner className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                    <Icons.twitter className="mr-2 h-4 w-4" />
                    )}{" "}
                    Twitter
                </Button>
            </div>
        </div>
    )
}

export function UserAuthRegisterDetailForm({ className, ...props}: UserAuthFormProps) {
    const [isLoading, setIsLoading] = useState<Boolean>(false)

    async function onSubmit(event: SyntheticEvent) {
        event.preventDefault()
        setIsLoading(true)

        setTimeout(() => {
            setIsLoading(false)
        }, 3000)
    }

    return (
        <div className={cn("grid gap-6", className)} {...props}>
            <form onSubmit={onSubmit}>
                <div className="grid gap-2">
                    <div className="grid gap-1">
                        <Label className="sr-only" htmlFor="email">
                        Email
                        </Label>
                        <Input
                        id="email"
                        placeholder="name@example.com"
                        type="email"
                        autoCapitalize="none"
                        autoComplete="email"
                        autoCorrect="off"
                        disabled={isLoading}
                        />
                    </div>
                    <div className="grid gap-1">
                        <Label className="sr-only" htmlFor="password">
                        Password
                        </Label>
                        <Input
                        id="password"
                        placeholder="password"
                        type="password"
                        autoCapitalize="none"
                        autoComplete="password"
                        autoCorrect="off"
                        disabled={isLoading}
                        />
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
                <Button variant="outline" type="button" disabled={isLoading}>
                    {isLoading ? (
                    <Icons.niceSpinner className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                    <Icons.gitHub className="mr-2 h-4 w-4" />
                    )}{" "}
                    Github
                </Button>
                <Button variant="outline" type="button" disabled={isLoading}>
                    {isLoading ? (
                    <Icons.niceSpinner className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                    <Icons.google className="mr-2 h-4 w-4" />
                    )}{" "}
                    Google
                </Button>
                <Button variant="outline" type="button" disabled={isLoading}>
                    {isLoading ? (
                    <Icons.niceSpinner className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                    <Icons.apple className="mr-2 h-4 w-4" />
                    )}{" "}
                    Apple
                </Button>
                <Button variant="outline" type="button" disabled={isLoading}>
                    {isLoading ? (
                    <Icons.niceSpinner className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                    <Icons.twitter className="mr-2 h-4 w-4" />
                    )}{" "}
                    Twitter
                </Button>
            </div>
        </div>
    )
}
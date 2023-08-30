import React, { SyntheticEvent, useState } from 'react'

import { cn } from "@/lib/utils"
import { Icons } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {}

export function UserAuthRegisterForm({ className, ...props }: UserAuthFormProps) {

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
            {/* <Button variant="outline" type="button" disabled={isLoading}>
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
            </Button> */}
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
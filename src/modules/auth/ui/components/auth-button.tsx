"use client";
import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { ClapperboardIcon, UserCircleIcon } from "lucide-react";

export const AuthButton = () => {
  return (
    <>
      <SignedIn>
        <UserButton>
          <UserButton.MenuItems>
            <UserButton.Link
              href="/studio"
              labelIcon={<ClapperboardIcon className="size-4" />}
              label="Studio"
            />
            <UserButton.Action label="manageAccount" />
          </UserButton.MenuItems>
        </UserButton>
      </SignedIn>

      <SignedOut>
        <SignInButton mode="modal">
          <Button
            variant={"outline"}
            className="py-2 hover:text-blue-500 border-blue-500/2  text-blue-600 px-4 text-sm font-medium
        rounded-full shadow-none "
          >
            <UserCircleIcon />
            Sign in
          </Button>
        </SignInButton>
      </SignedOut>
    </>
  );
};

import type { Metadata } from "next";

import { AuthForm } from "@/app/(auth)/AuthForm";

export const metadata: Metadata = {
  title: "Log in · One Pawn",
};

export default function LoginPage() {
  return <AuthForm mode="login" />;
}

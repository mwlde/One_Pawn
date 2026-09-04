import type { Metadata } from "next";

import { AuthForm } from "@/app/(auth)/AuthForm";

export const metadata: Metadata = {
  title: "Register · One Pawn",
};

export default function RegisterPage() {
  return <AuthForm mode="register" />;
}

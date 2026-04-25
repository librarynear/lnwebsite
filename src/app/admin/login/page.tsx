import { redirect } from "next/navigation";

export const metadata = {
  title: "Not Found",
  description: "This route is not publicly available.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginPage() {
  redirect("/");
}

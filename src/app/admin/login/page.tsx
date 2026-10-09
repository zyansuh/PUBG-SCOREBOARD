import { Battlefield } from "@/components/Battlefield";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <Battlefield />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <LoginForm />
      </div>
    </main>
  );
}

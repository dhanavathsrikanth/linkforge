import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center">
          <ArrowRight className="w-4 h-4 text-white" />
        </div>
        <span className="text-xl font-bold text-foreground">PivotUrl</span>
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}

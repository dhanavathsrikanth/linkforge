export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#09090b]">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur">
        <h1 className="mb-6 text-center text-2xl font-bold text-white">
          Create your <span className="text-violet-500">LinkForge</span> account
        </h1>
        {/* Clerk <SignUp /> goes here */}
      </div>
    </div>
  );
}

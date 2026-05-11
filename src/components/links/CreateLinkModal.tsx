"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { X, Link2, ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

const formSchema = z.object({
  destination: z.string().url({ message: "Please enter a valid URL" }),
  slug: z.string().min(2).max(64).optional().or(z.literal("")),
  title: z.string().max(120).optional(),
  password: z.string().max(64).optional().or(z.literal("")),
  tags: z.string().max(256).optional().or(z.literal("")),
});

export function CreateLinkModal({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      destination: "",
      slug: "",
      title: "",
      password: "",
      tags: "",
    }
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, workspaceId }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create link");
      }
      
      setOpen(false);
      reset();
      router.refresh();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Something went wrong");
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-violet-700 active:scale-95 shadow-lg shadow-violet-500/20">
          <Link2 className="h-4 w-4" />
          Create Link
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-white/10 bg-[#141418] p-6 shadow-2xl shadow-black duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-xl">
          <div className="flex flex-col space-y-1.5 text-center sm:text-left">
            <Dialog.Title className="text-lg font-semibold leading-none tracking-tight text-white">
              Create a short link
            </Dialog.Title>
            <Dialog.Description className="text-sm text-zinc-400">
              Transform your long URL into a trackable, branded short link.
            </Dialog.Description>
          </div>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div className="space-y-2">
              <label htmlFor="destination" className="text-sm font-medium text-zinc-300">
                Destination URL <span className="text-red-400">*</span>
              </label>
              <input
                id="destination"
                placeholder="https://example.com/very/long/path"
                className="flex h-10 w-full rounded-md border border-white/10 bg-[#09090b] px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                {...register("destination")}
              />
              {errors.destination && (
                <p className="text-xs text-red-400">{errors.destination.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="slug" className="text-sm font-medium text-zinc-300">
                  Custom Slug <span className="text-zinc-500 font-normal">(optional)</span>
                </label>
                <div className="flex items-center">
                  <span className="flex h-10 items-center rounded-l-md border border-r-0 border-white/10 bg-white/5 px-3 text-sm text-zinc-400">
                    linkforge.app/
                  </span>
                  <input
                    id="slug"
                    placeholder="my-campaign"
                    className="flex h-10 w-full rounded-r-md border border-white/10 bg-[#09090b] px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    {...register("slug")}
                  />
                </div>
                {errors.slug && (
                  <p className="text-xs text-red-400">{errors.slug.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium text-zinc-300">
                  Title <span className="text-zinc-500 font-normal">(optional)</span>
                </label>
                <input
                  id="title"
                  placeholder="My awesome link"
                  className="flex h-10 w-full rounded-md border border-white/10 bg-[#09090b] px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  {...register("title")}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-zinc-300">
                  Password <span className="text-zinc-500 font-normal">(optional)</span>
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="Secret access"
                  className="flex h-10 w-full rounded-md border border-white/10 bg-[#09090b] px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  {...register("password")}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="tags" className="text-sm font-medium text-zinc-300">
                  Tags <span className="text-zinc-500 font-normal">(comma separated)</span>
                </label>
                <input
                  id="tags"
                  placeholder="promo, summer, sales"
                  className="flex h-10 w-full rounded-md border border-white/10 bg-[#09090b] px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  {...register("tags")}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-center rounded-md border border-white/10 bg-transparent px-4 py-2 text-sm font-medium text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Create Advanced Link
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <Dialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground text-zinc-400">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

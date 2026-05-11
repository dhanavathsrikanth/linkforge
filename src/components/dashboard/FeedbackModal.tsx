"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { MessageSquare, X, Send, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const formSchema = z.object({
  message: z.string().min(5, "Message must be at least 5 characters").max(1000),
});

export function FeedbackModal() {
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const { register, handleSubmit, formState: { isSubmitting, errors }, reset } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (res.ok) {
        setSuccess(true);
        reset();
        setTimeout(() => {
          setOpen(false);
          setSuccess(false);
        }, 2000);
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-white/5 hover:text-white border border-transparent transition-all w-full mt-auto">
          <MessageSquare className="h-4 w-4" />
          Send Feedback
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-xl border border-white/10 bg-[#141418] p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-semibold text-white flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-violet-500" />
              Give Feedback
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-zinc-500 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          {success ? (
            <div className="py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 mb-4">
                <Send className="h-6 w-6 text-green-500" />
              </div>
              <h3 className="text-lg font-medium text-white">Message sent!</h3>
              <p className="text-sm text-zinc-400 mt-1">Thanks for helping us improve LinkForge.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">
                  How can we improve?
                </label>
                <textarea
                  {...register("message")}
                  placeholder="Share your thoughts, report a bug, or request a feature..."
                  className="min-h-[120px] w-full rounded-lg border border-white/10 bg-[#09090b] px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                {errors.message && (
                  <p className="text-xs text-red-400">{errors.message.message}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-all"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Send Message
                    <Send className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

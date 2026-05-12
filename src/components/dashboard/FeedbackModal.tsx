"use client";

import { useState } from "react";
import { MessageSquare, Send, X, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";

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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="mt-auto flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium text-slate-600 transition-all hover:border-slate-200 hover:bg-white hover:text-slate-950">
          <MessageSquare className="h-4 w-4" />
          Send Feedback
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-[#433BFF]" />
            Give Feedback
          </DialogTitle>
          <DialogDescription>
            Share your thoughts, report a bug, or request a feature.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F5F7FF] mb-4">
              <Send className="h-6 w-6 text-[#27CE7A]" />
            </div>
            <h3 className="text-lg font-medium text-slate-950">Message sent!</h3>
            <p className="text-sm text-slate-500 mt-1">Thanks for helping us improve LinkForge.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="message">How can we improve?</Label>
              <Textarea
                id="message"
                {...register("message")}
                placeholder="Share your thoughts, report a bug, or request a feature..."
                className="min-h-[120px]"
              />
              {errors.message && (
                <p className="text-xs text-red-600">{errors.message.message}</p>
              )}
            </div>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  Send Message
                  <Send className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { X, Link2, ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Link2 className="h-4 w-4" />
          Create Link
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a short link</DialogTitle>
          <DialogDescription>
            Transform your long URL into a trackable, branded short link.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="destination">
              Destination URL <span className="text-red-600">*</span>
            </Label>
            <Input
              id="destination"
              placeholder="https://example.com/very/long/path"
              {...register("destination")}
            />
            {errors.destination && (
              <p className="text-xs text-red-600">{errors.destination.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="slug">
                Custom Slug <span className="text-slate-500 font-normal">(optional)</span>
              </Label>
              <div className="flex items-center">
                <span className="flex h-10 items-center rounded-l-md border border-r-0 border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">
                  linkforge.app/
                </span>
                <Input
                  id="slug"
                  placeholder="my-campaign"
                  className="rounded-l-none"
                  {...register("slug")}
                />
              </div>
              {errors.slug && (
                <p className="text-xs text-red-600">{errors.slug.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-slate-500 font-normal">(optional)</span>
              </Label>
              <Input
                id="title"
                placeholder="My awesome link"
                {...register("title")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="password">
                Password <span className="text-slate-500 font-normal">(optional)</span>
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Secret access"
                {...register("password")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">
                Tags <span className="text-slate-500 font-normal">(comma separated)</span>
              </Label>
              <Input
                id="tags"
                placeholder="promo, summer, sales"
                {...register("tags")}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  Create Advanced Link
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

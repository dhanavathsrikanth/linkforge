"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"

import { cn } from "@/lib/utils"
import { XIcon } from "lucide-react"
import { Button } from "@/components/ui/Button"

function Popover({ ...props }: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger({ ...props }: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

function PopoverPortal({ ...props }: PopoverPrimitive.Portal.Props) {
  return <PopoverPrimitive.Portal data-slot="popover-portal" {...props} />
}

function PopoverClose({ ...props }: PopoverPrimitive.Close.Props) {
  return <PopoverPrimitive.Close data-slot="popover-close" {...props} />
}

function PopoverBackdrop({
  className,
  ...props
}: PopoverPrimitive.Backdrop.Props) {
  return (
    <PopoverPrimitive.Backdrop
      data-slot="popover-backdrop"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/5 duration-100 supports-backdrop-filter:backdrop-blur-[1px] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function PopoverContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: PopoverPrimitive.Popup.Props & {
  showCloseButton?: boolean
}) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Backdrop
        className="fixed inset-0 isolate z-50 bg-black/5 duration-100 supports-backdrop-filter:backdrop-blur-[1px] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
      />
      <PopoverPrimitive.Positioner
        positionMethod="fixed"
        className="!fixed !inset-0 !z-50 !flex !items-center !justify-center !pointer-events-none"
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(
            "relative w-full max-w-[calc(100%-1.5rem)] sm:max-w-[520px] max-h-[85vh] overflow-hidden rounded-2xl bg-popover shadow-2xl shadow-black/10 ring-1 ring-foreground/5 duration-150 outline-none pointer-events-auto data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        >
          {children}
          {showCloseButton && (
            <PopoverPrimitive.Close
              data-slot="popover-close"
              render={
                <Button
                  variant="ghost"
                  className="absolute top-3 right-3 h-7 w-7 rounded-full"
                  size="icon-sm"
                />
              }
            >
              <XIcon className="h-3.5 w-3.5" />
              <span className="sr-only">Close</span>
            </PopoverPrimitive.Close>
          )}
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  )
}

function PopoverHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="popover-header"
      className={cn("px-6 pt-5 pb-4 border-b border-border shrink-0", className)}
      {...props}
    />
  )
}

function PopoverFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="popover-footer"
      className={cn(
        "px-6 pb-6 pt-4 border-t border-border shrink-0 space-y-2",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <PopoverPrimitive.Close render={<Button variant="outline" className="w-full" />}>
          Close
        </PopoverPrimitive.Close>
      )}
    </div>
  )
}

function PopoverTitle({ className, ...props }: PopoverPrimitive.Title.Props) {
  return (
    <PopoverPrimitive.Title
      data-slot="popover-title"
      className={cn(
        "font-heading text-base font-semibold leading-none tracking-tight",
        className
      )}
      {...props}
    />
  )
}

function PopoverDescription({
  className,
  ...props
}: PopoverPrimitive.Description.Props) {
  return (
    <PopoverPrimitive.Description
      data-slot="popover-description"
      className={cn(
        "text-sm text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverClose,
  PopoverBackdrop,
  PopoverHeader,
  PopoverFooter,
  PopoverTitle,
  PopoverDescription,
}

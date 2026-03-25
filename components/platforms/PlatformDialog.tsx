"use client";

import { useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/Form"; // Assuming components/Form exists in a specific way
import { Input } from "@/components/input";
import { Switch } from "@/components/switch";
import toast from "react-hot-toast";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  currencyCode: z.string().min(1, "Currency is required").max(3),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform?: any;
}

export function PlatformDialog({ open, onOpenChange, platform }: Props) {
  const isEditing = !!platform;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      currencyCode: "USD",
      isActive: true,
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (platform) {
        form.reset({
          name: platform.name,
          currencyCode: platform.currencyCode,
          isActive: platform.isActive,
          notes: platform.notes || "",
        });
      } else {
        form.reset({
          name: "",
          currencyCode: "USD",
          isActive: true,
          notes: "",
        });
      }
    }
  }, [open, platform, form]);

  const utils = trpc.useUtils();
  
  const createMutation = trpc.platforms.create.useMutation({
    onSuccess: () => {
      toast.success("Platform created");
      utils.platforms.list.invalidate();
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create platform");
    }
  });

  const updateMutation = trpc.platforms.update.useMutation({
    onSuccess: () => {
      toast.success("Platform updated");
      utils.platforms.list.invalidate();
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update platform");
    }
  });

  const onSubmit = (values: FormValues) => {
    if (isEditing) {
      updateMutation.mutate({ id: platform.id, ...values });
    } else {
      createMutation.mutate(values);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Platform" : "Add Platform"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Broker Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Revolut, N26, IBKR..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="currencyCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base Currency</FormLabel>
                  <FormControl>
                    <Input placeholder="USD, EUR..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEditing && (
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Status</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Inactive platforms won't appear as choices for new trades.
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            <DialogFooter className="pt-4">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save Platform"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

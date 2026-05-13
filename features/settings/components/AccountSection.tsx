"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Pencil, Check, X, Upload, Trash2, User as UserIcon } from "lucide-react";
import toast from "react-hot-toast";
import { authClient, useSession } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/avatar";
import { Button } from "@/components/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/card";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { resizeImageToDataUrl } from "../lib/resizeImage";

const NAME_MAX = 80;

export function AccountSection() {
  const { data: session, isPending, refetch } = useSession();
  const user = session?.user;

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user && !editingName) {
      setNameDraft(user.name || "");
    }
  }, [user, editingName]);

  const handleSaveName = async () => {
    const next = nameDraft.trim();
    if (!next) {
      toast.error("Name cannot be empty");
      return;
    }
    if (next.length > NAME_MAX) {
      toast.error(`Name must be ${NAME_MAX} characters or fewer`);
      return;
    }
    if (next === user?.name) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      await authClient.updateUser({ name: next });
      await refetch();
      setEditingName(false);
      toast.success("Name updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update name");
    } finally {
      setSavingName(false);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      await authClient.updateUser({ image: dataUrl });
      await refetch();
      toast.success("Avatar updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setRemoving(true);
    try {
      await authClient.updateUser({ image: null });
      await refetch();
      toast.success("Avatar removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove avatar");
    } finally {
      setRemoving(false);
    }
  };

  const initials = (user?.name || user?.email || "?").charAt(0).toUpperCase();
  const hasImage = Boolean(user?.image);

  return (
    <Card loading={isPending}>
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>Your display name, email, and avatar.</CardDescription>
      </CardHeader>
      <CardContent>
        {isPending || !user ? (
          <div className="min-h-[120px]" />
        ) : (
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="flex flex-col items-center gap-3">
              <Avatar className="size-24 ring-1 ring-[color:var(--surface-3)]">
                {user.image ? <AvatarImage src={user.image} alt={user.name || "Avatar"} /> : null}
                <AvatarFallback className="text-2xl font-semibold [background-image:linear-gradient(135deg,var(--brand-from),var(--brand-to))] text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading || removing}
                >
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  {hasImage ? "Change" : "Upload"}
                </Button>
                {hasImage && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-destructive hover:text-destructive"
                    onClick={handleRemoveAvatar}
                    disabled={uploading || removing}
                  >
                    {removing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    Remove
                  </Button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={handleFile}
              />
            </div>

            <div className="flex-1 grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="account-name">Display name</Label>
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      id="account-name"
                      autoFocus
                      maxLength={NAME_MAX}
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveName();
                        if (e.key === "Escape") {
                          setNameDraft(user.name || "");
                          setEditingName(false);
                        }
                      }}
                    />
                    <Button size="sm" onClick={handleSaveName} disabled={savingName} className="gap-1">
                      {savingName ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setNameDraft(user.name || "");
                        setEditingName(false);
                      }}
                      disabled={savingName}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 flex-1 items-center rounded-md border bg-card px-3 text-sm">
                      <UserIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                      <span className="truncate">{user.name || "—"}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1"
                      onClick={() => setEditingName(true)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="account-email">Email</Label>
                <Input
                  id="account-email"
                  value={user.email}
                  readOnly
                  disabled
                  className="cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  Linked to your Google account. Contact support to change.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { AlertTriangle, Check, MessageSquareText } from "lucide-react";
import { usePreferences } from "@/providers/preferences-provider";
import { cancelDialogs, currentDialog, settleDialog, subscribeDialogs, type ActionRequest } from "@/lib/action-dialog";
import { Button } from "./button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./dialog";

export function ActionDialogHost() {
  const pathname = usePathname();
  const request = useSyncExternalStore(subscribeDialogs, currentDialog, () => null);
  useEffect(() => () => cancelDialogs(), [pathname]);
  return request ? <ActionDialog key={request.id} request={request} /> : null;
}

function ActionDialog({ request }: { request: ActionRequest }) {
  const { t } = usePreferences();
  const [value, setValue] = useState(request.initialValue);
  const Icon = request.destructive ? AlertTriangle : request.kind === "prompt" ? MessageSquareText : Check;
  const finish = (answer: string | boolean | null) => settleDialog(request.id, answer);
  return <Dialog open onOpenChange={open => { if (!open) finish(null); }}>
    <DialogContent className="en-action-dialog z-[150]" overlayClassName="z-[149] bg-black/40 backdrop-blur-md">
      <div className={`en-action-symbol ${request.destructive ? "en-action-danger" : ""}`} aria-hidden="true"><Icon size={23}/></div>
      <DialogHeader>
        <DialogTitle>{t(request.title ?? (request.kind === "notice" ? "Notice" : request.kind === "prompt" ? "Edit details" : "Confirm action"))}</DialogTitle>
        <DialogDescription className="whitespace-pre-wrap break-words leading-relaxed">{t(request.message)}</DialogDescription>
      </DialogHeader>
      <form onSubmit={event => { event.preventDefault(); finish(request.kind === "prompt" ? value : true); }}>
        {request.kind === "prompt" && <label className="mb-6 block text-sm font-medium">
          <span className="sr-only">{t(request.message)}</span>
          {request.multiline
            ? <textarea autoFocus rows={5} className="en-action-input" value={value} onChange={event => setValue(event.target.value)}/>
            : <input autoFocus className="en-action-input" value={value} onChange={event => setValue(event.target.value)}/>}
        </label>}
        <div className="flex flex-wrap justify-end gap-3">
          {request.kind !== "notice" && <Button type="button" variant="outline" className="rounded-xl px-5" onClick={() => finish(null)}>{t("Cancel")}</Button>}
          <Button type="submit" variant={request.destructive ? "destructive" : "default"} className="rounded-xl px-5">{t(request.confirmLabel ?? (request.kind === "notice" ? "OK" : request.kind === "prompt" ? "Save" : "Confirm"))}</Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>;
}

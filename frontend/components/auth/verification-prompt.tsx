"use client";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function VerificationPrompt() {
  const user=useAuthStore(s=>s.user);
  const [open,setOpen]=useState(()=>{try{return !user?.email_verified&&window.sessionStorage.getItem("en-verification-pending")==="1"}catch{return false}});
  useEffect(()=>{try{window.sessionStorage.removeItem("en-verification-pending")}catch{/* Browser storage may be unavailable. */}},[]);
  return <Dialog open={open} onOpenChange={setOpen}><DialogContent>
    <MailCheck size={28} className="text-primary"/>
    <DialogHeader><DialogTitle>Verify your email</DialogTitle><DialogDescription>Your email address is unverified. Manage verification from your profile.</DialogDescription></DialogHeader>
    <div className="flex flex-wrap justify-end gap-2"><button className="en-outline-button" onClick={()=>setOpen(false)}>Later</button><Link className="en-solid-button" href="/settings" onClick={()=>setOpen(false)}>Go to profile</Link></div>
  </DialogContent></Dialog>;
}

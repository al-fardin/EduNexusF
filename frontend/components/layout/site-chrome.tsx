"use client";
import {usePathname} from "next/navigation";
import Link from "next/link";
import {useState} from "react";
import {BookOpenText,GraduationCap,House,Plus,UserRound,X} from "lucide-react";
import {NotificationBell} from "@/components/layout/notification-bell";
import {useAuthStore} from "@/store/auth-store";
const navigation=[{href:"/",label:"Home",icon:House},{href:"/instructor/classrooms",label:"Teaching",icon:BookOpenText},{href:"/student/classrooms",label:"Learning",icon:GraduationCap},{href:"/settings",label:"Profile",icon:UserRound}];
const authPaths=["/login","/register","/forgot-password","/reset-password","/verify-email"];
const active=(path:string,href:string)=>href==="/"?path==="/":path.startsWith(href);
export function SiteChrome({children}:{children:React.ReactNode}){
 const pathname=usePathname()??"/";const [menuPath,setMenuPath]=useState<string|null>(null);const user=useAuthStore(s=>s.user);const authRoute=authPaths.includes(pathname);const preview=pathname.startsWith('/preview');const menuOpen=menuPath===pathname;
 if(authRoute)return <>{children}</>;
 return <><div className="en-ambient" aria-hidden="true"><i/><i/></div><div className="en-top-wrap"><header className="en-topbar"><Link href={preview?'/preview':'/'} className="en-logo" aria-label="EduNexus home"><span className="en-logo-icon"><BookOpenText size={23}/></span><strong>EduNexus<span className="en-logo-dot">.</span></strong></Link><nav className="en-top-links" aria-label="Primary navigation">{!preview&&navigation.map(n=>{const Icon=n.icon;return <Link key={n.href} href={n.href} className="en-top-link" aria-current={active(pathname,n.href)?'page':undefined}><Icon size={17}/>{n.label}</Link>})}</nav><div className="en-top-actions">{!preview&&<NotificationBell/>}{!preview&&<button className="en-user en-create-menu" type="button" aria-label={menuOpen?'Close class actions':'Class actions'} aria-expanded={menuOpen} onClick={()=>setMenuPath(menuOpen?null:pathname)}>{menuOpen?<X size={20}/>:<Plus size={20}/>}</button>}<Link className="en-user en-desktop-account" href={preview?'/login':'/settings'}><UserRound size={17}/>{user?.first_name||'Account'}</Link></div></header>{menuOpen&&<nav className="en-quick-actions" aria-label="Class actions"><Link href="/instructor/classrooms/create" onClick={()=>setMenuPath(null)}><Plus size={18}/>Create class</Link><Link href="/student/classrooms/join" onClick={()=>setMenuPath(null)}><GraduationCap size={18}/>Join class</Link></nav>}</div><div className="en-site-main">{children}</div>{!preview&&<nav className="en-bottom-nav" aria-label="Mobile navigation">{navigation.map(n=>{const Icon=n.icon;return <Link key={n.href} href={n.href} aria-current={active(pathname,n.href)?'page':undefined}><Icon size={21} strokeWidth={active(pathname,n.href)?2.4:1.8}/><span>{n.label}</span></Link>})}</nav>}<footer className="en-footer"><span>© {new Date().getFullYear()} EduNexus</span></footer></>;
}

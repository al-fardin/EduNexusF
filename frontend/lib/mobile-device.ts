import {useSyncExternalStore} from "react";
export function isMobileDevice(){if(typeof navigator==='undefined')return false;return /Android|iPhone|iPad|iPod|Mobile|EduNexusAndroid/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)}
const subscribe=()=>()=>{};
export function useMobileDevice(){return useSyncExternalStore(subscribe,isMobileDevice,()=>false)}

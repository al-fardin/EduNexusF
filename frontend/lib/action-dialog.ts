type Options = { title?: string; confirmLabel?: string; destructive?: boolean; multiline?: boolean };
export type ActionRequest = Options & {
  id: number;
  kind: "confirm" | "prompt" | "notice";
  message: string;
  initialValue: string;
};
type Pending = { request: ActionRequest; resolve: (value: string | boolean | null) => void };
const queue: Pending[] = [];
const listeners = new Set<() => void>();
let sequence = 0;
const emit = () => listeners.forEach(listener => listener());

function request(kind: ActionRequest["kind"], message: string, initialValue: string, options: Options) {
  return new Promise<string | boolean | null>(resolve => {
    queue.push({ request: { ...options, kind, message, initialValue, id: ++sequence }, resolve });
    emit();
  });
}
export async function requestConfirm(message: string, options: Options = {}): Promise<boolean> {
  return (await request("confirm", message, "", options)) === true;
}
export async function requestText(message: string, initialValue = "", options: Options = {}): Promise<string | null> {
  const value = await request("prompt", message, initialValue, options);
  return typeof value === "string" ? value : null;
}
export async function showNotice(message: string, options: Options = {}): Promise<void> {
  await request("notice", message, "", options);
}
export function subscribeDialogs(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export const currentDialog = () => queue[0]?.request ?? null;
export function settleDialog(id: number, value: string | boolean | null) {
  if (queue[0]?.request.id !== id) return;
  queue.shift()!.resolve(value);
  emit();
}
// Route changes must not leave a pending destructive action on another screen.
export function cancelDialogs() {
  const pending = queue.splice(0);
  pending.forEach(item => item.resolve(null));
  emit();
}

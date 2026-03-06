import { toast } from "sonner";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastOptions {
  duration?: number;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

/**
 * Show a toast notification
 */
export function showToast(
  message: string,
  type: ToastType = "info",
  options?: ToastOptions,
) {
  const { duration = 3000, position = "bottom-right" } = options || {};

  switch (type) {
    case "success":
      toast.success(message, { duration, position });
      break;
    case "error":
      toast.error(message, { duration, position });
      break;
    case "warning":
      toast.warning(message, { duration, position });
      break;
    case "info":
    default:
      toast(message, { duration, position });
      break;
  }
}

/**
 * Show error toast
 */
export function showErrorToast(message: string, options?: ToastOptions) {
  showToast(message, "error", { duration: 5000, ...options });
}

/**
 * Show success toast
 */
export function showSuccessToast(message: string, options?: ToastOptions) {
  showToast(message, "success", options);
}

/**
 * Show loading toast (returns dismiss function)
 */
export function showLoadingToast(message: string) {
  const id = toast.loading(message);
  return () => toast.dismiss(id);
}

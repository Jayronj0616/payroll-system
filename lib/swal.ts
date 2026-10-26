import type { SweetAlertOptions } from "sweetalert2";

// SweetAlert2 is ~20 kB gzipped and only needed once a dialog or toast
// actually opens, so it is loaded on first use instead of in every page's
// initial bundle. Returns the same promise as Swal.fire().
export async function fireSwal(options: SweetAlertOptions) {
  const { default: Swal } = await import("sweetalert2");
  return Swal.fire(options);
}

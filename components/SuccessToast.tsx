"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Swal from "sweetalert2";

export default function SuccessToast() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const success = searchParams.get("success");

  useEffect(() => {
    if (!success) return;

    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: success,
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    });

    // Strip the success param from the URL without a full navigation,
    // so refreshing the page doesn't re-fire the toast.
    const params = new URLSearchParams(searchParams.toString());
    params.delete("success");
    const query = params.toString();
    router.replace(query ? `?${query}` : window.location.pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [success]);

  return null;
}

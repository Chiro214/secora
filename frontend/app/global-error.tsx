"use client";

export const dynamic = "force-dynamic";

import { useEffect } from "react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error);
    }, [error]);

    return (
        <html>
            <body>
                <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-950 text-white">
                    <h2 className="mb-4 text-2xl font-bold">Something went wrong!</h2>
                    <button
                        onClick={
                            // Attempt to recover by trying to re-render the segment
                            () => reset()
                        }
                        className="rounded bg-blue-600 px-4 py-2 hover:bg-blue-700"
                    >
                        Try again
                    </button>
                </div>
            </body>
        </html>
    );
}

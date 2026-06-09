import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Alesof Platform",
  description: "Plataforma empresarial de Alesof Perú S.A.C.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
        <Toaster
          position="top-right"
          expand={false}
          gap={8}
          toastOptions={{
            classNames: {
              toast:
                "!font-[Inter_Variable,Inter,system-ui,sans-serif] !rounded-xl !border !border-slate-200/80 !shadow-xl !shadow-slate-900/8 !backdrop-blur-sm !bg-white/95 !text-slate-800 !text-sm !font-medium !px-4 !py-3.5",
              title: "!font-semibold !text-[13.5px] !text-slate-900",
              description: "!text-slate-500 !text-[12.5px] !mt-0.5",
              success:
                "!border-emerald-200/70 before:!bg-emerald-500 [&>[data-icon]]:!text-emerald-500",
              error:
                "!border-red-200/70 [&>[data-icon]]:!text-red-500",
              warning:
                "!border-amber-200/70 [&>[data-icon]]:!text-amber-500",
              info:
                "!border-blue-200/70 [&>[data-icon]]:!text-blue-500",
              closeButton:
                "!rounded-lg !border-slate-200 !bg-white hover:!bg-slate-50",
            },
          }}
        />
      </body>
    </html>
  );
}

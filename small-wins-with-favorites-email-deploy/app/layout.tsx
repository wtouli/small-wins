
import { AuthShell } from "@/components/AuthClient";
export const metadata = { title: "Small Wins", description: "Busy-parent & beginner-friendly calorie tracker" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "ui-sans-serif, system-ui", background: "linear-gradient(#eff6ff,#f8fafc)", color: "#0f172a" }}>
        <AuthShell>{children}</AuthShell>
      </body>
    </html>
  );
}

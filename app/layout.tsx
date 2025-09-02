export const metadata = {
  title: "Vinyl Remaining",
  description: "Elegant vinyl roll remaining calculator",
};

import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

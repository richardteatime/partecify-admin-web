import "./globals.css";

export const metadata = {
  title: "Partecify Admin",
  description: "Pannello amministrativo Partecify",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body className="bg-neutral-100 text-neutral-900">{children}</body>
    </html>
  );
}
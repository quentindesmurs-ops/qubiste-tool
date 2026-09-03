import "./globals.css";

export const metadata = {
  title: "QBST — Extracteur de termes saillants",
  description: "Outil interne Uni-Médias : extraction et pondération des termes saillants d'une SERP.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}

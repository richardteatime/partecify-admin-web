export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Panoramica</h2>
        <p className="text-neutral-500">
          Gestisci contenuti, codici QR, registrazioni ed eliminazioni.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          "Contenuti",
          "Codici QR",
          "Registrazioni",
          "Eliminazione",
        ].map((item) => (
          <div key={item} className="rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="font-semibold">{item}</h3>
            <p className="mt-2 text-sm text-neutral-500">
              Modulo disponibile nel pannello amministrativo.
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
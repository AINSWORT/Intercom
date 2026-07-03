export default function ErrorState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
      <p className="text-sm text-destructive font-medium">
        {message || 'Ocurrió un error al cargar los datos.'}
      </p>
      <button onClick={() => window.location.reload()} className="text-sm text-primary hover:underline font-medium">
        Reintentar
      </button>
    </div>
  );
}

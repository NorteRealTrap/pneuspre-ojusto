interface InfoPageProps {
  title: string;
  description: string;
}

export function InfoPage({ title, description }: InfoPageProps) {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold mb-4">{title}</h1>
        <p className="text-gray-700 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

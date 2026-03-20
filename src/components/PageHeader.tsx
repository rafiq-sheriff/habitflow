export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="ph">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  );
}

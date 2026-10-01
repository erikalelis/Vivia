import { Link, useSearchParams } from 'react-router-dom';
import { Empty, ErrorBox, Loading } from '@/components/ui';
import { useLoad } from '@/hooks/useLoad';
import { globalSearch } from '@/services/api';

export default function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get('q') ?? '';
  const { data, loading, error, reload } = useLoad(() => globalSearch(q), [q]);

  return (
    <div>
      <h1 className="page-title">Resultados para «{q}»</h1>
      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data?.length ? <Empty>No encontré nada con esa palabra.</Empty> : (
        <ul className="space-y-2">
          {data.map((h) => (
            <li key={`${h.type}-${h.id}`}>
              <Link to={h.to} className="card flex items-center gap-3">
                <span className="chip bg-salvia-soft text-salvia-dark">{h.type}</span>
                <span className="min-w-0 flex-1 truncate">{h.title}</span>
                {h.subtitle && <span className="text-sm text-suave">{h.subtitle}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

export function renderWithProviders(
  ui,
  {
    route = '/',
    queryClient = createTestQueryClient(),
    router = true,
  } = {},
) {
  const tree = (
    <QueryClientProvider client={queryClient}>
      {router ? <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter> : ui}
    </QueryClientProvider>
  );

  return {
    queryClient,
    ...render(tree),
  };
}

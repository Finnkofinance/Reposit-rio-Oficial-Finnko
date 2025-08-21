
import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/router';

// Context Providers
import { AccountsProvider } from '@/context/accounts/AccountsContext';
import { TransactionsProvider } from '@/context/transactions/TransactionsContext';
import { CardsProvider } from '@/context/cards/CardsContext';
import { InvestmentsProvider } from '@/context/investments/InvestmentsContext';
import { CategoriesProvider } from '@/context/categories/CategoriesContext';
import { AuthProvider } from '@/features/auth/AuthProvider';

// App Layout Component
import App from '@/App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <CategoriesProvider>
        <AccountsProvider>
          <TransactionsProvider>
            <CardsProvider>
              <InvestmentsProvider>
                <App />
              </InvestmentsProvider>
            </CardsProvider>
          </TransactionsProvider>
        </AccountsProvider>
      </CategoriesProvider>
    </AuthProvider>
  </React.StrictMode>
);

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

export function renderWithProviders(
  ui: React.ReactElement,
  { route = '/', authUser = null }: { route?: string; authUser?: any } = {}
) {
  window.history.pushState({}, 'Test page', route);
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider initialUser={authUser}>{ui}</AuthProvider>
    </MemoryRouter>
  );
}

export function renderWithSockets(
  ui: React.ReactElement,
  options?: { route?: string; authUser?: any }
) {
  return renderWithProviders(<SocketProvider>{ui}</SocketProvider>, options);
}

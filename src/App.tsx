import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './app/routes/AppRoutes';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { AuthProvider } from './context/AuthContext';
import { AppearanceProvider } from './context/AppearanceProvider';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppearanceProvider>
          <WorkspaceProvider>
            <AppRoutes />
          </WorkspaceProvider>
        </AppearanceProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

import { createContext, useContext, useReducer, useCallback } from 'react';

const AppContext = createContext(null);

const initialState = {
  activePlatformId: null,
  refreshKey: 0,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_PLATFORM':
      return { ...state, activePlatformId: action.id };
    case 'REFRESH':
      return { ...state, refreshKey: state.refreshKey + 1 };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setActivePlatform = useCallback((id) => {
    dispatch({ type: 'SET_PLATFORM', id });
  }, []);

  const refresh = useCallback(() => {
    dispatch({ type: 'REFRESH' });
  }, []);

  return (
    <AppContext.Provider value={{ state, setActivePlatform, refresh }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}

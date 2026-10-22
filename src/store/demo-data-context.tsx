import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { DemoState, UserRole } from '../types/attendance';
import { DUMMY_PRACTICUMS, DUMMY_SESSIONS, DUMMY_USERS } from '../data/dummy-data';

// In-memory demo state. Attendance data will be added in a later stage.
const initialState: DemoState = {
  activeRole: null,
  activeUserId: null,
  users: DUMMY_USERS,
  practicums: DUMMY_PRACTICUMS,
  sessions: DUMMY_SESSIONS,
  attendanceRecords: [],
};

type Action =
  | { type: 'SELECT_IDENTITY'; payload: { role: UserRole; userId: string } }
  | { type: 'OPEN_SESSION'; payload: { sessionId: string; at: string } }
  | { type: 'CLOSE_SESSION'; payload: { sessionId: string; at: string } };

const DemoReducer = (state: DemoState, action: Action): DemoState => {
  switch (action.type) {
    case 'SELECT_IDENTITY':
      return {
        ...state,
        activeRole: action.payload.role,
        activeUserId: action.payload.userId,
      };
    case 'OPEN_SESSION': {
      const session = state.sessions.find((item) => item.id === action.payload.sessionId);

      if (!session || session.status !== 'upcoming' || state.activeRole !== 'asisten') {
        return state;
      }

      return {
        ...state,
        sessions: state.sessions.map((item) =>
          item.id === action.payload.sessionId
            ? { ...item, status: 'open', openedAt: action.payload.at }
            : item
        ),
      };
    }
    case 'CLOSE_SESSION': {
      const session = state.sessions.find((item) => item.id === action.payload.sessionId);

      if (!session || session.status !== 'open' || state.activeRole !== 'asisten') {
        return state;
      }

      return {
        ...state,
        sessions: state.sessions.map((item) =>
          item.id === action.payload.sessionId
            ? { ...item, status: 'closed', closedAt: action.payload.at }
            : item
        ),
      };
    }
    default:
      return state;
  }
};

const DemoContext = createContext<{
  state: DemoState;
  dispatch: React.Dispatch<Action>;
}>({ state: initialState, dispatch: () => null });

export const DemoProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(DemoReducer, initialState);
  return (
    <DemoContext.Provider value={{ state, dispatch }}>
      {children}
    </DemoContext.Provider>
  );
};

export const useDemoData = () => useContext(DemoContext);
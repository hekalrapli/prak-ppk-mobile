import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { DemoState, UserRole } from '../types/attendance';
import { DUMMY_PRACTICUMS, DUMMY_SESSIONS, DUMMY_USERS } from '../data/dummy-data';

// Initial state (Nanti kita tambahkan data sesi dan kehadiran di tahap selanjutnya)
const initialState: DemoState = {
  activeRole: null,
  activeUserId: null,
  users: DUMMY_USERS,
  practicums: DUMMY_PRACTICUMS,
  sessions: DUMMY_SESSIONS,
  attendanceRecords: [],
};

type Action = 
  | { type: 'SELECT_IDENTITY'; payload: { role: UserRole; userId: string } };

const DemoReducer = (state: DemoState, action: Action): DemoState => {
  switch (action.type) {
    case 'SELECT_IDENTITY':
      return {
        ...state,
        activeRole: action.payload.role,
        activeUserId: action.payload.userId,
      };
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
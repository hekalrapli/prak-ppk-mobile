import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { AttendanceRecord, DemoState, LeaveRequest, UserRole } from '../types/attendance';
import {
  DUMMY_ATTENDANCE_RECORDS,
  DUMMY_PRACTICUMS,
  DUMMY_SESSIONS,
  DUMMY_USERS,
} from '../data/dummy-data';

// In-memory demo state shared by both roles during a single app run.
const initialState: DemoState = {
  activeRole: null,
  activeUserId: null,
  users: DUMMY_USERS,
  practicums: DUMMY_PRACTICUMS,
  sessions: DUMMY_SESSIONS,
  attendanceRecords: DUMMY_ATTENDANCE_RECORDS,
  leaveRequests: [],
};

export function findAttendanceRecord(
  records: AttendanceRecord[],
  sessionId: string,
  praktikanId: string
) {
  return records.find(
    (record) => record.sessionId === sessionId && record.praktikanId === praktikanId
  );
}

export function canManageSession(state: DemoState, sessionId: string) {
  if (state.activeRole !== 'asisten' || !state.activeUserId) {
    return false;
  }

  const session = state.sessions.find((item) => item.id === sessionId);
  const practicum = session
    ? state.practicums.find((item) => item.id === session.practicumId)
    : undefined;

  return practicum?.assistantId === state.activeUserId;
}

type Action =
  | { type: 'SELECT_IDENTITY'; payload: { role: UserRole; userId: string } }
  | { type: 'OPEN_SESSION'; payload: { sessionId: string; at: string } }
  | { type: 'CLOSE_SESSION'; payload: { sessionId: string; at: string } }
  | {
      type: 'RECORD_ATTENDANCE';
      payload: { sessionId: string; praktikanId: string; at: string };
    }
  | { type: 'ADD_LEAVE_REQUEST'; payload: LeaveRequest }
  | { type: 'UPDATE_LEAVE_REQUEST'; payload: { sessionId: string; praktikanId: string; reason: string } }
  | { type: 'CANCEL_LEAVE_REQUEST'; payload: { sessionId: string; praktikanId: string } };

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

      if (
        !session ||
        session.status !== 'upcoming' ||
        !canManageSession(state, action.payload.sessionId)
      ) {
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

      if (
        !session ||
        session.status !== 'open' ||
        !canManageSession(state, action.payload.sessionId)
      ) {
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
    case 'RECORD_ATTENDANCE': {
      const { sessionId, praktikanId, at } = action.payload;
      const session = state.sessions.find((item) => item.id === sessionId);

      if (
        !session ||
        session.status !== 'open' ||
        state.activeRole !== 'praktikan' ||
        state.activeUserId !== praktikanId ||
        findAttendanceRecord(state.attendanceRecords, sessionId, praktikanId)
      ) {
        return state;
      }

      const record: AttendanceRecord = {
        id: `ATT-${sessionId}-${praktikanId}`,
        sessionId,
        praktikanId,
        status: 'present',
        recordedAt: at,
      };

      return {
        ...state,
        attendanceRecords: [...state.attendanceRecords, record],
      };
    }
    case 'ADD_LEAVE_REQUEST': {
      const current = state.leaveRequests || [];
      const filtered = current.filter(
        (r) => !(r.sessionId === action.payload.sessionId && r.praktikanId === action.payload.praktikanId)
      );
      return {
        ...state,
        leaveRequests: [...filtered, action.payload],
      };
    }
    case 'UPDATE_LEAVE_REQUEST': {
      const current = state.leaveRequests || [];
      return {
        ...state,
        leaveRequests: current.map((r) =>
          r.sessionId === action.payload.sessionId && r.praktikanId === action.payload.praktikanId
            ? { ...r, reason: action.payload.reason }
            : r
        ),
      };
    }
    case 'CANCEL_LEAVE_REQUEST': {
      const current = state.leaveRequests || [];
      return {
        ...state,
        leaveRequests: current.filter(
          (r) => !(r.sessionId === action.payload.sessionId && r.praktikanId === action.payload.praktikanId)
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
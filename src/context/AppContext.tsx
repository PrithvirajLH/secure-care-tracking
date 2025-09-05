import { createContext, useContext, useMemo, useReducer } from "react";

export interface Employee {
  // Core fields from dbo.SecureCareEmployee table
  employeeId: number;
  area: string | null;
  facility: string | null;
  staffRoll: string | null;
  name: string;
  employeeNumber: string | null;
  awardType: 'Level 1' | 'Level 2' | 'Level 3' | 'Consultant' | 'Coach' | null;
  assignedDate: Date | null;
  completedDate: Date | null;
  conferenceCompleted: Date | null;
  secureCareAwardedDate: Date | null;
  secureCareAwarded: boolean | null;
  notes: string | null;
  advisorId: number | null;
  
  // Video scheduling fields (Level 2 & 3)
  scheduleStandingVideo: Date | null;
  standingVideo: Date | null;
  scheduleSleepingVideo: Date | null;
  sleepingVideo: Date | null;
  scheduleFeedGradVideo: Date | null;
  feedGradVideo: Date | null;
  schedulenoHandnoSpeak: Date | null;  // Fixed field name to match database
  noHandnoSpeak: Date | null;          // Fixed field name to match database
  
  // Session scheduling fields (Consultant & Coach) - using aliases from backend
  scheduleSession1: Date | null;  // Mapped from scheduleSession#1
  session1: Date | null;          // Mapped from session#1
  scheduleSession2: Date | null;  // Mapped from scheduleSession#2
  session2: Date | null;          // Mapped from session#2
  scheduleSession3: Date | null;  // Mapped from scheduleSession#3
  session3: Date | null;          // Mapped from session#3
  
  // Original database field names (for compatibility)
  'scheduleSession#1'?: Date | null;
  'session#1'?: Date | null;
  'scheduleSession#2'?: Date | null;
  'session#2'?: Date | null;
  'scheduleSession#3'?: Date | null;
  'session#3'?: Date | null;
  
  // Approval status (for Level 2+)
  awaiting: boolean | null;
  
  // Backend response fields (from views/queries)
  Employee?: string;    // Alias for name from backend
  Facility?: string;    // Alias for facility from backend
  Area?: string;        // Alias for area from backend
  advisorName?: string; // Joined from Advisor table
  
  // UI-only fields for compatibility
  staffRoles?: string; // Mapped from staffRoll
  conferenceRejected?: boolean; // Derived from awaiting status
}

export interface DashboardStats {
  totalEmployees: number;
  completionRates: {
    carePartner: number;
    associate: number;
    champion: number;
    consultant: number;
    coach: number;
  };
  pendingAssignments: number;
  overdueTraining: number;
  facilitiesCount: number;
  areasCount: number;
}

interface FilterState {
  query: string;
  facility?: string;
  area?: string;
}

interface AppState {
  employees: Employee[];
  filters: FilterState;
  selectedEmployee: Employee | null;
}

type Action =
  | { type: "setEmployees"; payload: Employee[] }
  | { type: "setQuery"; payload: string }
  | { type: "selectEmployee"; payload: Employee | null };

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
}>({ state: { employees: [], filters: { query: "" }, selectedEmployee: null }, dispatch: () => {} });

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "setEmployees":
      return { ...state, employees: action.payload };
    case "setQuery":
      return { ...state, filters: { ...state.filters, query: action.payload } };
    case "selectEmployee":
      return { ...state, selectedEmployee: action.payload };
    default:
      return state;
  }
}

const employees: Employee[] = []; // Empty array - will be populated from MySQL database

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    employees: [], // Will be populated from MySQL database
    filters: { query: "" },
    selectedEmployee: null,
  });

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

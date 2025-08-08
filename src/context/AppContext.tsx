import { createContext, useContext, useMemo, useReducer } from "react";

export interface Employee {
  area: string;
  facility: string;
  staffRoles: string;
  name: string;
  employeeId: string;
  level1ReliasAssigned: Date | null;
  level1ReliasCompleted: Date | null;
  secureCarePartnerAwarded: boolean;
  level2ReliasAssigned: Date | null;
  level2ReliasCompleted: Date | null;
  level2ConferenceCompleted: Date | null;
  level2Notes: string;
  level2Advisor: string;
  standingVideo: Date | null;
  sleepingSittingVideo: Date | null;
  feedingGradVideo: Date | null;
  secureCareAssociateAwarded: boolean;
  level2AwaitingRelias: Date | null;
  level3ReliasAssigned: Date | null;
  level3ReliasCompleted: Date | null;
  level3ConferenceCompleted: Date | null;
  level3Notes: string;
  level3Advisor: string;
  sittingStandingApproaching: Date | null;
  noHandNoSpeak: Date | null;
  challengeSleeping: Date | null;
  secureCareChampionAwarded: boolean;
  level3AwaitingRelias: Date | null;
  consultantReliasAssigned: Date | null;
  consultantReliasCompleted: Date | null;
  consultantConferenceCompleted: Date | null;
  consultantNotes: string;
  consultantAdvisor: string;
  coachingSession1: Date | null;
  coachingSession2: Date | null;
  coachingSession3: Date | null;
  secureCareConsultantAwarded: boolean;
  consultantAwaitingRelias: Date | null;
  coachReliasAssigned: Date | null;
  coachReliasCompleted: Date | null;
  coachConferenceCompleted: Date | null;
  coachNotes: string;
  coachAdvisor: string;
  coachCoachingSession1: Date | null;
  coachCoachingSession2: Date | null;
  coachCoachingSession3: Date | null;
  secureCareCoachAwarded: boolean;
  coachAwaitingRelias: Date | null;
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

const mockEmployees: Employee[] = [
  {
    area: "North",
    facility: "Evergreen",
    staffRoles: "Caregiver",
    name: "Alex Johnson",
    employeeId: "E-1001",
    level1ReliasAssigned: new Date("2024-02-01"),
    level1ReliasCompleted: new Date("2024-02-20"),
    secureCarePartnerAwarded: true,
    level2ReliasAssigned: new Date("2024-03-01"),
    level2ReliasCompleted: null,
    level2ConferenceCompleted: null,
    level2Notes: "Pending videos",
    level2Advisor: "Dr. Smith",
    standingVideo: null,
    sleepingSittingVideo: null,
    feedingGradVideo: null,
    secureCareAssociateAwarded: false,
    level2AwaitingRelias: null,
    level3ReliasAssigned: null,
    level3ReliasCompleted: null,
    level3ConferenceCompleted: null,
    level3Notes: "",
    level3Advisor: "",
    sittingStandingApproaching: null,
    noHandNoSpeak: null,
    challengeSleeping: null,
    secureCareChampionAwarded: false,
    level3AwaitingRelias: null,
    consultantReliasAssigned: null,
    consultantReliasCompleted: null,
    consultantConferenceCompleted: null,
    consultantNotes: "",
    consultantAdvisor: "",
    coachingSession1: null,
    coachingSession2: null,
    coachingSession3: null,
    secureCareConsultantAwarded: false,
    consultantAwaitingRelias: null,
    coachReliasAssigned: null,
    coachReliasCompleted: null,
    coachConferenceCompleted: null,
    coachNotes: "",
    coachAdvisor: "",
    coachCoachingSession1: null,
    coachCoachingSession2: null,
    coachCoachingSession3: null,
    secureCareCoachAwarded: false,
    coachAwaitingRelias: null,
  },
  {
    area: "South",
    facility: "Lakeside",
    staffRoles: "Nurse",
    name: "Maria Chen",
    employeeId: "E-1002",
    level1ReliasAssigned: new Date("2024-01-05"),
    level1ReliasCompleted: new Date("2024-01-20"),
    secureCarePartnerAwarded: true,
    level2ReliasAssigned: new Date("2024-02-01"),
    level2ReliasCompleted: new Date("2024-02-25"),
    level2ConferenceCompleted: new Date("2024-03-05"),
    level2Notes: "Great progress",
    level2Advisor: "Dr. Lee",
    standingVideo: new Date("2024-03-10"),
    sleepingSittingVideo: new Date("2024-03-15"),
    feedingGradVideo: new Date("2024-03-18"),
    secureCareAssociateAwarded: true,
    level2AwaitingRelias: null,
    level3ReliasAssigned: new Date("2024-04-01"),
    level3ReliasCompleted: null,
    level3ConferenceCompleted: null,
    level3Notes: "",
    level3Advisor: "",
    sittingStandingApproaching: null,
    noHandNoSpeak: null,
    challengeSleeping: null,
    secureCareChampionAwarded: false,
    level3AwaitingRelias: null,
    consultantReliasAssigned: null,
    consultantReliasCompleted: null,
    consultantConferenceCompleted: null,
    consultantNotes: "",
    consultantAdvisor: "",
    coachingSession1: null,
    coachingSession2: null,
    coachingSession3: null,
    secureCareConsultantAwarded: false,
    consultantAwaitingRelias: null,
    coachReliasAssigned: null,
    coachReliasCompleted: null,
    coachConferenceCompleted: null,
    coachNotes: "",
    coachAdvisor: "",
    coachCoachingSession1: null,
    coachCoachingSession2: null,
    coachCoachingSession3: null,
    secureCareCoachAwarded: false,
    coachAwaitingRelias: null,
  },
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    employees: mockEmployees,
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

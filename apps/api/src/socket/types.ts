import type { SessionSnapshot } from "../services/sessionSnapshot";

export interface StudentJoinPayload {
  sessionId: string;
}

export interface StaffJoinPayload {}

export interface ChatSendPayload {
  sessionId: string;
  sender: "STUDENT" | "STAFF";
  text: string;
}

export interface ChatMessagePayload {
  id: string;
  sessionId: string;
  createdAt: string;
  sender: "STUDENT" | "STAFF";
  text: string;
}

export interface HighRiskAlertPayload {
  sessionId: string;
  riskScore: number;
  studentName: string | null;
}

export interface ChatRecommendedPayload {
  sessionId: string;
}

export interface CallbackRequestedPayload {
  snapshot: NonNullable<SessionSnapshot>;
}

export interface AnalysisCompletePayload {
  sessionId: string;
  riskScore: number;
  riskLabel: string;
  barriers: { code: string; severity: string; notes: string }[];
  nextSteps: string[];
  caseSummary: string;
  urgency: string;
  strengths: string;
  recommendedAvatar: string;
}

export interface ServerToClientEvents {
  "chat:message": (msg: ChatMessagePayload) => void;
  "session:update": (snapshot: NonNullable<SessionSnapshot>) => void;
  "alert:high_risk": (payload: HighRiskAlertPayload) => void;
  "chat:recommended": (payload: ChatRecommendedPayload) => void;
  "callback:requested": (payload: CallbackRequestedPayload) => void;
  "analysis:complete": (payload: AnalysisCompletePayload) => void;
}

export interface ClientToServerEvents {
  "student:join": (payload: StudentJoinPayload) => void;
  "staff:join": (payload: StaffJoinPayload) => void;
  "chat:send": (payload: ChatSendPayload) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  role?: "STUDENT" | "STAFF";
  sessionId?: string;
}


// Garage 61 API Types

export interface Garage61User {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
  nickName: string;
  subscriptionPlan: string;
  apiPermissions: string[];
  teams: TeamInfo[];
  subscribedDataPacks?: SubscribedDataPack[];
  subscribedDataPackGroups?: SubscribedDataPackGroup[];
}

export interface TeamInfo {
  id: string;
  name: string;
  slug: string;
  role: string;
  avatar?: string;
}

export interface SubscribedDataPack {
  id: string;
  name: string;
  description?: string;
  version: string;
  track?: string;
  car?: string;
}

export interface SubscribedDataPackGroup {
  id: string;
  name: string;
  description?: string;
  track?: string;
  car?: string;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

// Generic API response wrapper
export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Project Manager" | "Consultant";
  status: "Active" | "Suspended";
  joinedDate: string;
}

export interface AdminProject {
  id: string;
  name: string;
  clientName: string;
  budget: number;
  teamSize: number;
  location: string;
}

export interface AdminStat {
  title: string;
  value: number | string;
  change?: string;
}
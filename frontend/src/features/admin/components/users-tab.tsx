import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { UserPlus } from "lucide-react";
import { Pagination } from "../../../components/shared/pagination";
import type { AdminUserItem, UserMeta } from "../types/admin.types";
import { activateUser, suspendUser } from "../services/admin.service";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";


export type UserStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "LOCKED";

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: UserStatus;

}


interface UserTabProps {
  readonly searchQuery?: string;
  readonly roleFilter?: string;
  readonly statusFilter?: string;
  readonly users: AdminUserItem[];
  readonly meta: UserMeta | null;
  readonly loading: boolean;
  readonly currentPage: number;
  readonly onPageChange: (page: number) => void;
  readonly refresh: () => void;
  readonly error: string | null;
}

export const getIntials = (name: string) => {
  if (!name) return;
  const splitName = name.trim().split(" ");
  const first = splitName[0];
  const last = splitName[1];

  return `${first[0]}${last[0]}`.toUpperCase();
}

export default function UsersTab({ searchQuery = "", roleFilter = "", statusFilter = "", users, meta, loading, currentPage, onPageChange, refresh, error }: UserTabProps) {
  const navigate = useNavigate();
  const filtered = users.filter((u) => {
    const query = searchQuery.toLowerCase();
    const searchMatch = !query || u.fullName.toLowerCase().includes(query) || u.email.toLowerCase().includes(query);
    const roleMatch = !roleFilter || u.role === roleFilter;
    const statusMatch = !statusFilter || u.status === statusFilter;
    return searchMatch && roleMatch && statusMatch;
  });


  const handleStatusChange = async (userId: string, currentStatus: string) => {
    try {

      if (currentStatus === "ACTIVE") {
        await suspendUser(userId);
      } else {
        await activateUser(userId);
      }

      refresh();

    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update user status");

    }

  };


  return (
    <Card
      className="w-full bg-white overflow-hidden "
      style={{
        padding: "28px",
        border: " 1px solid #f1f5f9"
      }}
    >
      <div
        className="flex items-center justify-between px-8 py-5 "
        style={{
          borderColor: "#f1f5f9",
          padding: "8px"
        }}
      >
        <h2 className="font-bold">User</h2>

        <Button
          variant="default"
          onClick={() => navigate("/register")}
          className="flex items-center rounded-md gap-2"
          style={{
            fontSize: "14px",
            padding: "4px 6px",
          }}
        >
          <UserPlus size={16} />
          Add user
        </Button>

      </div>

      {error && <p className="px-8 text-red-600 text-sm">{error}</p>}


      <div className="w-full overflow-x-auto">
        {loading ? (
          <div className="flex h-screen items-center justify-center font-medium" style={{ backgroundColor: "var(--color-surface)", color: "var(--color-primary)" }}>
            Loading users...
          </div>
        ) : (<table className="w-full border-separate border-spacing-y-4 text-left">
          <thead>
            <tr className="bg-[#F5F9FF] h-6">
              <th className="px-8 py-4 font-bold text-[16px]">Name</th>
              <th className="px-8 py-4 font-bold text-[16px]">Email</th>
              <th className="px-8 py-4 font-bold text-[16px]">Status</th>
              <th className="px-8 py-4 font-bold text-[16px]">Role</th>
              <th className="px-8 py-4 font-bold text-[16px]">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((user) => (
              <tr key={user.id} className="border-b hover:bg-slate-50 border-b-gray-200 ">
                <td className="flex items-center gap-4 px-8 py-4">
                  <div
                    className="rounded-full flex items-center justify-center text-white font-bold shrink-0"
                    style={{
                      width: "30px",
                      height: "30px",
                      minWidth: "30px",
                      minHeight: "30px",
                      backgroundColor: "var(--color-primary)",

                    }}
                  >
                    {getIntials(user.fullName)}
                  </div>

                  <span className="font-semibold">
                    {user.fullName}
                  </span>
                </td>

                <td className="px-8 py-4" >
                  <span>
                    {user.email}
                  </span>
                </td>

                <td className="px-8 py-4">
                  <span>
                    {user.status}
                  </span>
                </td>

                <td className="px-8 py-4">
                  <span>
                    {user.role}
                  </span>
                </td>
                <td className="px-8 py-4">
                  <div className="flex item gap-4">

                    {user.status === "ACTIVE" ? (
                      <Button
                        onClick={() => handleStatusChange(user.id, user.status)}
                        className="flex items-center gap-2 rounded-md font-semibold  bg-[#F0780E] transition hover:bg-orange-600"
                        style={{
                          color: "white",
                          fontSize: "14px",
                          padding: "2px 6px",
                        }}
                      >
                        Suspend
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleStatusChange(user.id, user.status)}
                        className="px-5 py-2 rounded-md text-white font-semibold bg-[#46B162] hover:bg-emerald-600"
                        style={{
                          color: "white",
                          fontSize: "14px",
                          padding: "2px 6px",
                        }}
                      >
                        Activate
                      </Button>

                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>


        </table>
        )}

      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={meta?.totalPages ?? 1}
        onPageChange={onPageChange}
      />

    </Card>

  );
}
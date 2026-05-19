import { Trash2, UserX, RotateCcw } from "lucide-react";
import type { AdminUser } from "../types/admin.types";

interface UsersTableProps {
  users: AdminUser[];
  onSuspend: (id: string) => void;
  onReactivate: (id: string) => void;
  onRemove: (id: string) => void;
}

export default function UsersTable({
  users,
  onSuspend,
  onReactivate,
  onRemove,
}: Readonly<UsersTableProps>) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-white">
      <table className="w-full">
        <thead
          className="border-b"
          style={{
            borderColor:
              "var(--color-border)",
          }}
        >
          <tr>
            <th className="text-left px-6 py-4">
              Name
            </th>

            <th className="text-left px-6 py-4">
              Email
            </th>

            <th className="text-left px-6 py-4">
              Role
            </th>

            <th className="text-left px-6 py-4">
              Status
            </th>

            <th className="text-left px-6 py-4">
              Actions
            </th>
          </tr>
        </thead>

        <tbody>
          {users.map((user) => (
            <tr
              key={user.id}
              className="border-b"
              style={{
                borderColor:
                  "var(--color-border)",
              }}
            >
              <td className="px-6 py-5">
                {user.name}
              </td>

              <td className="px-6 py-5">
                {user.email}
              </td>

              <td className="px-6 py-5">
                {user.role}
              </td>

              <td className="px-6 py-5">
                <span
                  className="px-3 py-1 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor:
                      user.status === "Active"
                        ? "rgba(22,163,74,0.12)"
                        : "rgba(185,28,28,0.12)",
                    color:
                      user.status === "Active"
                        ? "var(--color-success)"
                        : "var(--color-danger)",
                  }}
                >
                  {user.status}
                </span>
              </td>

              <td className="px-6 py-5">
                <div className="flex items-center gap-3">
                  {user.status ===
                  "Active" ? (
                    <button
                      onClick={() =>
                        onSuspend(user.id)
                      }
                      className="p-2 rounded-lg border"
                    >
                      <UserX size={18} />
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        onReactivate(
                          user.id
                        )
                      }
                      className="p-2 rounded-lg border"
                    >
                      <RotateCcw size={18} />
                    </button>
                  )}

                  <button
                    onClick={() =>
                      onRemove(user.id)
                    }
                    className="p-2 rounded-lg border"
                  >
                    <Trash2
                      size={18}
                      className="text-red-600"
                    />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
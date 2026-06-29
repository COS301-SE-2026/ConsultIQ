import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import {UserPlus} from "lucide-react";
import { useState } from "react";

export type UserStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "LOCKED";

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: UserStatus;

}

const MockData: User[]=[
  {
    id:"user-00001",
    fullName: "Amanda Black",
    email: "amandablack@gmail.com",
    role: "consultant",
    status: "ACTIVE"
  },

  {
    id:"user-00002",
    fullName: "Unathi Nkosi",
    email: "uanthinkosik@gmail.com",
    role: "consultant",
    status: "SUSPENDED"
  },

  {
    id:"user-00003",
    fullName: "Luke Smith",
    email: "lukesmith@gmail.com",
    role: "consultant",
    status: "ACTIVE"
  },
];

interface UserTabProps {
  searchQuery?: string;
  roleFilter?: string;
  statusFilter?: string;
}

const getIntials = (name :string) =>{
   if(!name) return;
   const splitName= name.trim().split(" ");
   const first= splitName[0];
   const last= splitName[1];

   return `${first[0]}${last[0]}`.toUpperCase();
}

export default function UsersTab( {searchQuery= "", roleFilter = "", statusFilter = ""} : UserTabProps) {

  const filtered = MockData.filter((u) => {
    const query = searchQuery.toLowerCase();
    const searchMatch = !query || u.fullName.toLowerCase().includes(query) || u.email.toLowerCase().includes(query);
    const roleMatch = !roleFilter || u.role === roleFilter;
    const statusMatch= !statusFilter || u.status === statusFilter;
    return searchMatch && roleMatch && statusMatch;
  });

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE= 5;

  const totalPages= Math.ceil(filtered.length/ITEMS_PER_PAGE);
  const startIndex= (currentPage -1) * ITEMS_PER_PAGE;
  const currentItems = filtered.slice(startIndex,startIndex+ITEMS_PER_PAGE);
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
              className="flex items-center rounded-md gap-2"
              style={{
                            color: "white",
                            fontSize: "14px",
                            padding: "4px 6px",
                          }}
            >
              <UserPlus size={16}/>
              Add user 
            </Button>
          
        </div>

      <div className="w-full overflow-x-auto">
          <table className="w-full border-separate border-spacing-y-4 text-left">
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
              {currentItems.map((user)=>(
                <tr key={user.id}  className="border-b hover:bg-slate-50 border-b-gray-200 ">
                  <td className="flex items-center gap-4 px-8 py-4">
                    <div  
                      className="rounded-full flex items-center justify-center text-white font-bold shrink-0"
                      style={{
                        width: "30px",
                        height:"30px",
                        minWidth:"30px",
                        minHeight:"30px",
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
                      <Button 
                        variant="ghost"
                        className="px-5 py-2 rounded-md text-white font-semibold bg-[#F00E0E] hover:bg-red-700"
                        style={{
                            color: "white",
                            fontSize: "14px",
                            padding: "2px 6px",
                          }}
                      >
                        Delete
                      </Button>

                      {user.status === "ACTIVE" ? (
                        <Button 
                           className="flex items-center gap-2 rounded-md font-semibold  bg-[#F0780E] transition hover:bg-orange-600"
                          style={{
                            color: "white",
                            fontSize: "14px",
                            padding: "2px 6px",
                          }}
                        >
                          Suspend
                        </Button>
                      ):(
                        <Button
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
      </div>
        {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-6 mt-10 pb-8">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-5 py-2.5 rounded-lg border-2 border-solid font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  style={{ borderColor: "var(--color-primary)", color: "var(--color-primary)" }}
                >
                  Previous
                </button>
                <span className="text-lg font-medium" style={{ color: "var(--color-text-secondary)" }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-5 py-2.5 rounded-lg border-2 border-solid font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  style={{ borderColor: "var(--color-primary)", color: "var(--color-primary)" }}
                >
                  Next
                </button>
              </div>
            )}
    
    </Card>
 
  );
}

import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";



export interface User {
    id: string;
    fullName: string;
    email: string;
    skills: string[];
    phoneNumber: string;
    isAssigned: string;

}

// interface ProjectConsultantsProps {
//     users: User[];

// }

 const getIntials = (name: string) => {
  if (!name) return;
  const splitName = name.trim().split(" ");
  const first = splitName[0];
  const last = splitName[1];

  return `${first[0]}${last[0]}`.toUpperCase();
}

 const MOCK_CONSULTANTS: User[] = [
    {
        id: "usr-001",
        fullName: "Amahle Dlamini",
        email: "amahle.dlamini@example.com",
        phoneNumber: "+27 82 123 4567",
        skills: ["React", "TypeScript", "Tailwind CSS"],
        isAssigned: "true",
    },
    {
        id: "usr-002",
        fullName: "Liam van der Merwe",
        email: "liam.vdm@example.com",
        phoneNumber: "+27 71 987 6543",
        skills: ["Node.js", "PostgreSQL", "Prisma"],
        isAssigned: "true",
    },
    {
        id: "usr-003",
        fullName: "Sipho Ndlovu",
        email: "sipho.ndlovu@example.com",
        phoneNumber: "+27 83 456 7890",
        skills: ["Java", "Spring Boot", "Docker"],
        isAssigned: "true",
    },
    {
        id: "usr-004",
        fullName: "Chloë Smith",
        email: "chloe.smith@example.com",
        phoneNumber: "+27 84 321 0987",
        skills: ["Next.js", "GraphQL", "Jest"],
        isAssigned: "true",
    },
];


export default function ProjectConsultants() {

    const handleReassign = () => {

    }

    return (
        <Card
            className="w-full bg-white overflow-hidden "
            style={{
                padding: "28px",
                border: " 1px solid #f1f5f9"
            }}
        >

            <h2 className="font-bold">Assigned Consultants</h2>

            <div className="w-full">
                <table className="w-full border-separate border-spacing-y-4 text-left">
                    <thead>
                        <tr className="bg-[#F5F9FF] h-6">
                            <th className="px-8 py-4 font-bold text-[16px]">Name</th>
                            <th className="px-8 py-4 font-bold text-[16px]">Contact</th>
                            <th className="px-8 py-4 font-bold text-[16px]">Skills</th>
                            <th className="px-8 py-4 font-bold text-[16px]">Actions</th>
                        </tr>
                    </thead>


                    <tbody>
                        {MOCK_CONSULTANTS.map((user) => (
                            <tr key={user.id} className="border-b hover:bg-slate-50 border-b-gray-200 align-top  ">
                                <td className="flex items-center justify-center gap-4 px-8 py-4">
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

                                <td className="px-8 py-4 " >
                                    <div className="flex flex-col">
                                        <span>
                                            {user.email}
                                        </span>
                                        <span>
                                            {user.phoneNumber}
                                        </span>
                                    </div>
                                </td>

                                <td className="px-8 py-4">
                                    <div className="flex flex-wrap gap-2">
                                         {user.skills.map((skill) => (
                                        <span
                                            key={skill}
                                            className="rounded-md border whitespace-nowrap"
                                            style={{
                                                padding: "5px 14px",
                                                borderColor: "var(--color-border)",
                                                color: "var(--color-text-secondary)",
                                                fontSize: "var(--text-h4)",
                                            }}
                                        >
                                            {skill}
                                        </span>
                                    ))}  
                                    </div>
                                 
                                </td>
                                <td className="px-8 py-4">
                                    <Button
                                        onClick={() => handleReassign()}
                                        className="px-5 py-2 rounded-md text-white font-semibold bg-[#d22b2b] hover:bg-red-800"
                                        style={{
                                            color: "white",
                                            fontSize: "14px",
                                            padding: "2px 6px",
                                        }}
                                    >
                                        Unassign
                                    </Button>

                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

        </Card>

    );
}
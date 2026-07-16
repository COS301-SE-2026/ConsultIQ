import { Video, FileQuestion,MessageCircle, Icon } from "lucide-react";

const HELP_ITEMS=[
    {icon: Video, label: "Video Tutorial",desc: "Step-by-step walkthroughs",href:"#"},
    {icon: FileQuestion, label: "FAQs",desc: "Common questions answered",href:"#"},
    {icon: MessageCircle, label: "Support",desc: "Contact us",href:"#"},
]

export default function HelpDropdown(){
    return(
        
        <div>
            <div>
                <p>Help & Resources</p>
                <p>Everything you need to get the most out of ConsultIQ</p>
            </div>
            <div className="p-2">
                {HELP_ITEMS.map(({icon: Icon, label,desc,href}) =>(
                    <a 
                        key={label}
                        href={href}
                    >

                    </a>
                ))}

            </div>
        </div>
    );
}
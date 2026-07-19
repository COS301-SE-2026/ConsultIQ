
const STEPS =[
    {
        number: "01",
        title: "Upload & Extract",
        description: "Upload consultant CVs. ConsultIQ automatically extracts and structures personal info,skills,experience and education.",
    },
    {
        number: "02",
        title: "Review & Verify",
        description: "The manager reviews extracted information, corrects fields and. ",
        
    },
    {
        number: "03",
        title: "Configure scoring",
        description: "Set consultancy-wide default weights, then let  project managers override them per project as needed. ",
       
    },
     {
        number: "04",
        title: "Get ranked recommendations",
        description: "Run the fit score engine against a project. Receive a ranked, transparent shortlist ready to present to the client. ",
       
    },
];
export default function MechanicsSection(){
    return(
          <div className="relative min-h-175 flex flex-col items-center  justify-center p-8  gap-10 w-full">
            <div className="flex flex-col items-center gap-2 text-center max-w-4xl mx-auto gap-y-5">
                   
                    <h1 className="text-brand-blue! text-5xl font-bold ">
                        From CV upload to ranked shortlist
                    </h1>
                    
                    <p className=" text-brand-muted max-w-xl text-lg max-auto ">
                       Four steps from raw document to client-ready documentation.
                    </p>
            </div> 

    
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    {STEPS.map(({number,title,description}) => (
                        <div
                            key={number}
                            className="flex flex-col items-start"
                        >
                            <div className="w-16 h-16 rounded-full bg-brand-gold text-white text-xl font-bold flex  items-center justify-center mb-5">
                               {number}
                            </div>
                            <h3 className="font-bold text-brand-blue  ">{title}</h3>
                            <p className="text-base text-brand-muted leading-relaxed">{description}</p>

                        </div>
                            
                    ))}
                </div>


        </div>
    );
}
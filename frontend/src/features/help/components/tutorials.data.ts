import RegisterManager from "../../../../public/help_thumbnails/register_manager.png"
import ProfileCreation from "../../../../public/help_thumbnails/profile_creation.png"
import RegisterConsultant from "../../../../public/help_thumbnails/register_consultant.png"
import Consultancy from "../../../../public/help_thumbnails/consultancy-wide.png"
import Project from "../../../../public/help_thumbnails/project-wide.png"
export interface TutorialItem{
  
    title: string;
    desc: string;
    duration: string;
    embedUrl: string;
    thumbnail:string;

}



export  const tutorials: TutorialItem[] = [
  {
  
    title: "Onboarding a consultant manager",
    desc: "Onboard a consultant manager using the consultiq admin portal",
    duration: "2 min",
    embedUrl:"https://embed.app.guidde.com/playbooks/mwcJ5vN8HJPiA8kdQiH92h?mode=videoOnly",
    thumbnail:RegisterManager,
  },
  {
    title: "Creating profiles for consultants ",
    desc: " A consultant manager  creates profiles for consultants ",
    duration: "6 min",
    embedUrl:"https://embed.app.guidde.com/playbooks/s6xH2b9w4pVwkKrEHmsdwA?mode=videoOnly",
    thumbnail:ProfileCreation,
  },
  {
    title: "Matching consultants to projects",
    desc: "Learn to match a consultants to projects and confidently recommend consultant to your clients.",
    duration: "2 min",
    embedUrl:"https://embed.app.guidde.com/playbooks/rbVHKek3W9ZCBx2nh5UkWL?mode=videoOnly",
    thumbnail:RegisterConsultant,
  },
   {
    title: "Setting consultancy-wide configurations",
    desc: "Learn to set the consultancy wide configurations that influence the scoring engine",
    duration: "2 min",
    embedUrl:"https://embed.app.guidde.com/playbooks/2mECR3hxwpN1YwuvUzmuZC?mode=videoOnly",
    thumbnail:Consultancy,
  },
    {
    title: "Setting project-wide configurations",
    desc: "Learn to set the project wide configurations that influence the scoring engine",
    duration: "2 min",
    embedUrl:"https://embed.app.guidde.com/playbooks/6T75M13Lk4BNH3XHXe66kq?mode=videoOnly",
    thumbnail:Project,
  },
];
export interface TutorialItem{
    id:string;
    title: string;
    desc: string;
    duration: string;

}



export  const tutorials: TutorialItem[] = [
  {
    id: "ROl5qxDkfQY",
    title: "Full onboarding walkthrough",
    desc: "From account setup to your first ranked recommendation list — everything you need to get ConsultIQ running for your team.",
    duration: "8 min",
  },
  {
    id: "oUnB4lK616Y",
    title: "Building your first scoring model ",
    desc: " As a consultant manager or project manager configure factor weights and understand how each dimension impacts final rankings and consultant fit scores.",
    duration: "7 min",
  },
  {
    id: "FfFXsYf3w1M",
    title: "Matching consultants to projects",
    desc: "Learn to match a consultants to projects and confidently recommend consultant to your clients.",
    duration: "5 min",
  },
];